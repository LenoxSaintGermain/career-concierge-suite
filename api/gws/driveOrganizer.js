import admin from 'firebase-admin';
import * as gws from './gwsClient.js';

const ROOT_FOLDER_ID = () => process.env.GWS_DRIVE_ROOT_FOLDER_ID || '';
const CLIENTS_FOLDER_ID = () => process.env.GWS_CLIENTS_FOLDER_ID || '';
const HUMAN_FOLDER_FALLBACK = 'Career Concierge Client';

const nonEmpty = (value) => String(value ?? '').trim();

const titleCase = (input) =>
  input
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const deriveNameFromEmail = (email) => {
  const localPart = nonEmpty(email).split('@')[0] || '';
  const cleaned = localPart.replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').trim();
  return cleaned ? titleCase(cleaned) : '';
};

const safeShareWithUser = async (fileId, email) => {
  if (!email) return;
  try {
    await gws.shareWithUser(fileId, email, 'writer');
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('already')) return;
    throw error;
  }
};

export const getClientDisplayName = (clientData) =>
  nonEmpty(clientData?.display_name) ||
  nonEmpty(clientData?.demo_profile?.name) ||
  deriveNameFromEmail(clientData?.email) ||
  '';

export const getClientFolderName = (clientData) => {
  const displayName = getClientDisplayName(clientData);
  const email = nonEmpty(clientData?.email);
  if (displayName && email) return `${displayName} (${email})`;
  if (displayName) return displayName;
  if (email) return email;
  return HUMAN_FOLDER_FALLBACK;
};

export const resolveClientIdentity = async (db, uid) => {
  const clientRef = db.collection('clients').doc(uid);
  const clientSnap = await clientRef.get();
  const clientData = clientSnap.exists ? clientSnap.data() : {};
  const needsEmail = !nonEmpty(clientData?.email);
  const needsDisplayName = !nonEmpty(clientData?.display_name) && !nonEmpty(clientData?.demo_profile?.name);

  if (!needsEmail && !needsDisplayName) {
    return clientData;
  }

  try {
    const authUser = await admin.auth().getUser(uid);
    const patch = {};
    if (needsEmail && nonEmpty(authUser.email)) patch.email = nonEmpty(authUser.email);
    if (needsDisplayName) {
      const derivedDisplayName = nonEmpty(authUser.displayName) || deriveNameFromEmail(authUser.email);
      if (derivedDisplayName) patch.display_name = derivedDisplayName;
    }
    if (Object.keys(patch).length) {
      await clientRef.set(patch, { merge: true });
      return { ...clientData, ...patch };
    }
  } catch (_error) {
    // Non-blocking: keep document sync working even if Auth lookup is unavailable.
  }

  return clientData;
};

/** Human-readable doc titles keyed by artifact type. */
export const ARTIFACT_DOC_TITLES = {
  brief: 'The Brief',
  suite_distilled: 'Strategic Map',
  profile: 'Professional DNA',
  ai_profile: 'AI Positioning',
  gaps: 'Skill Gaps Analysis',
  readiness: 'AI Readiness Report',
  cjs_execution: 'Job Search Execution',
  plan: '72-Hour Plan',
  resume_review: 'Resume Review',
  search_strategy: 'Search Strategy',
};

/**
 * Ensure a Drive folder exists for a client. Returns the folder ID.
 * Caches the folder ID on the client Firestore document.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uid
 * @returns {Promise<string>} Drive folder ID
 */
export const ensureClientFolder = async (db, uid) => {
  const clientRef = db.collection('clients').doc(uid);
  const clientData = await resolveClientIdentity(db, uid);
  const email = nonEmpty(clientData.email);
  const folderName = getClientFolderName(clientData);

  // Return cached folder ID if present
  if (clientData.drive_folder_id) {
    if (folderName) {
      await gws.updateFileMetadata(clientData.drive_folder_id, { name: folderName });
    }
    await safeShareWithUser(clientData.drive_folder_id, email);
    return clientData.drive_folder_id;
  }

  const parentId = CLIENTS_FOLDER_ID() || ROOT_FOLDER_ID();
  const folder = await gws.createFolder(folderName, parentId);

  // Share the folder with the client if we have their email
  await safeShareWithUser(folder.id, email);

  // Cache the folder ID (merge in case client doc doesn't exist yet)
  await clientRef.set({ drive_folder_id: folder.id }, { merge: true });

  return folder.id;
};

/**
 * Get the Google Doc title for an artifact type.
 * @param {string} artifactType
 * @param {string} [clientName]
 * @returns {string}
 */
export const getDocTitle = (artifactType, clientName) => {
  const base = ARTIFACT_DOC_TITLES[artifactType] || artifactType;
  return clientName ? `${base} — ${clientName}` : base;
};
