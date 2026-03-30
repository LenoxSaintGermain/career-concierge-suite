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

const looksLikeInternalId = (value) => /^[A-Za-z0-9_-]{20,}$/.test(nonEmpty(value));

const isIgnorableShareError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('already') ||
    message.includes('do not have a google account') ||
    message.includes('cannot share') ||
    message.includes('invalid sharing request')
  );
};

const safeShareWithUser = async (fileId, email) => {
  if (!email) return;
  try {
    await gws.shareWithUser(fileId, email, 'writer');
  } catch (error) {
    if (isIgnorableShareError(error)) return;
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
      const rawDisplayName = nonEmpty(authUser.displayName);
      const derivedDisplayName =
        rawDisplayName && !looksLikeInternalId(rawDisplayName) ? rawDisplayName : deriveNameFromEmail(authUser.email);
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

  // Return cached folder ID if present and still valid
  if (clientData.drive_folder_id) {
    try {
      if (folderName) {
        await gws.updateFileMetadata(clientData.drive_folder_id, { name: folderName });
      }
      // Stamp UID on existing folder for future lookups (idempotent)
      await gws.setAppProperties(clientData.drive_folder_id, { cc_uid: uid }).catch(() => {});
      await safeShareWithUser(clientData.drive_folder_id, email);
      return clientData.drive_folder_id;
    } catch (err) {
      // Cached folder may have been deleted — fall through to create
      console.warn(`[drive-organizer] Cached folder ${clientData.drive_folder_id} for ${uid} not accessible:`, err.message);
    }
  }

  const parentId = CLIENTS_FOLDER_ID() || ROOT_FOLDER_ID();
  if (parentId) {
    const siblings = await gws.listFolderContents(parentId);
    // Match by UID property first (reliable), then fall back to name match
    // only if the folder also has no cc_uid set (unclaimed legacy folder)
    const existingFolder = siblings.find(
      (item) =>
        item.mimeType === 'application/vnd.google-apps.folder' &&
        item.appProperties?.cc_uid === uid,
    ) || siblings.find(
      (item) =>
        item.mimeType === 'application/vnd.google-apps.folder' &&
        item.name === folderName &&
        !item.appProperties?.cc_uid,
    );
    if (existingFolder?.id) {
      await gws.setAppProperties(existingFolder.id, { cc_uid: uid }).catch(() => {});
      await safeShareWithUser(existingFolder.id, email);
      await clientRef.set({ drive_folder_id: existingFolder.id }, { merge: true });
      return existingFolder.id;
    }
  }
  const folder = await gws.createFolder(folderName, parentId);

  // Stamp the UID on the new folder for reliable future lookups
  await gws.setAppProperties(folder.id, { cc_uid: uid }).catch(() => {});

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
  return base;
};
