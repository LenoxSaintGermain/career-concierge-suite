import * as gws from './gwsClient.js';
import { getDocRegistryEntry, upsertDocRegistryEntry, markDocRegistryError } from './docRegistry.js';
import { ensureClientFolder, getClientDisplayName, getDocTitle, resolveClientIdentity } from './driveOrganizer.js';
import { buildDocRequests, hasTemplate } from './templateEngine.js';

const LEGACY_DUPLICATE_ARCHIVE_NAME = '_Legacy duplicates';

const artifactDocMatches = (name, baseTitle) => {
  const candidate = String(name || '').trim();
  if (!candidate) return false;
  return (
    candidate === baseTitle ||
    candidate.startsWith(`${baseTitle} —`) ||
    candidate.startsWith(`${baseTitle} -`) ||
    candidate.startsWith(`Legacy duplicate — ${baseTitle}`)
  );
};

const sortByModifiedDesc = (items) =>
  [...items].sort(
    (a, b) => new Date(b?.modifiedTime || 0).getTime() - new Date(a?.modifiedTime || 0).getTime(),
  );

const ensureLegacyArchiveFolder = async (folderId) => {
  const contents = await gws.listFolderContents(folderId);
  const existing = contents.find(
    (item) => item.mimeType === 'application/vnd.google-apps.folder' && item.name === LEGACY_DUPLICATE_ARCHIVE_NAME,
  );
  if (existing?.id) return existing.id;
  const created = await gws.createFolder(LEGACY_DUPLICATE_ARCHIVE_NAME, folderId);
  return created.id;
};

const archiveDuplicateDocs = async (folderId, baseTitle, keepId) => {
  const contents = await gws.listFolderContents(folderId);
  const duplicates = sortByModifiedDesc(
    contents.filter(
      (item) =>
        item.mimeType === 'application/vnd.google-apps.document' &&
        item.id !== keepId &&
        artifactDocMatches(item.name, baseTitle),
    ),
  );
  if (!duplicates.length) return;
  const archiveFolderId = await ensureLegacyArchiveFolder(folderId);
  await Promise.all(
    duplicates.map(async (item) => {
      await gws.updateFileMetadata(item.id, {
        name: item.name.startsWith('Legacy duplicate — ') ? item.name : `Legacy duplicate — ${item.name}`,
      });
      await gws.moveToFolder(item.id, archiveFolderId);
    }),
  );
};

const findExistingArtifactDoc = async (folderId, baseTitle) => {
  const contents = await gws.listFolderContents(folderId);
  const matches = sortByModifiedDesc(
    contents.filter(
      (item) => item.mimeType === 'application/vnd.google-apps.document' && artifactDocMatches(item.name, baseTitle),
    ),
  );
  return matches[0] || null;
};

const isMissingDriveEntityError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('requested entity was not found') ||
    message.includes('insufficient file permissions') ||
    message.includes('cannot find file')
  );
};

/**
 * Sync all artifacts for a client to Google Docs.
 * Non-blocking — errors are recorded in the registry, never thrown.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uid
 * @param {Record<string, { content: object, version?: number }>} artifacts
 * @returns {Promise<object>} summary of sync results
 */
export const syncArtifactsToGoogleDocs = async (db, uid, artifacts) => {
  if (process.env.GWS_DOCS_ENABLED !== 'true') {
    return { status: 'disabled' };
  }

  const clientData = await resolveClientIdentity(db, uid);
  const clientMeta = {
    displayName: getClientDisplayName(clientData),
    email: clientData.email || '',
  };

  let folderId;
  try {
    folderId = await ensureClientFolder(db, uid);
  } catch (err) {
    console.error(`[doc-publisher] Failed to create client folder for ${uid}:`, err.message);
    return { status: 'error', error: 'folder_creation_failed', detail: err.message };
  }

  const artifactTypes = Object.keys(artifacts).filter(hasTemplate);
  const results = await Promise.allSettled(
    artifactTypes.map((type) =>
      syncSingleArtifact(db, uid, type, artifacts[type], clientMeta, folderId),
    ),
  );

  const summary = { status: 'completed', synced: 0, errors: 0, details: {} };
  for (let i = 0; i < artifactTypes.length; i++) {
    const type = artifactTypes[i];
    const result = results[i];
    if (result.status === 'fulfilled') {
      summary.synced++;
      summary.details[type] = result.value;
    } else {
      summary.errors++;
      summary.details[type] = { status: 'error', error: result.reason?.message };
    }
  }

  return summary;
};

/**
 * Sync a single artifact to its Google Doc.
 */
const syncSingleArtifact = async (db, uid, artifactType, artifact, clientMeta, folderId) => {
  const content = artifact?.content || artifact;
  const version = artifact?.version || 1;
  const registry = await getDocRegistryEntry(db, uid, artifactType);
  const title = getDocTitle(artifactType, clientMeta.displayName);
  const requests = buildDocRequests(artifactType, content, clientMeta);

  try {
    if (registry?.google_doc_id) {
      try {
        await gws.updateFileMetadata(registry.google_doc_id, { name: title });
        await gws.clearDocumentBody(registry.google_doc_id);
        await gws.batchUpdate(registry.google_doc_id, requests);
        await archiveDuplicateDocs(folderId, title, registry.google_doc_id);

        await upsertDocRegistryEntry(db, uid, artifactType, {
          artifact_version: version,
          last_synced_at: new Date().toISOString(),
          status: 'synced',
          error_detail: null,
        });

        return { status: 'updated', google_doc_id: registry.google_doc_id };
      } catch (registryError) {
        if (!isMissingDriveEntityError(registryError)) {
          throw registryError;
        }
        console.warn(
          `[doc-publisher] Registry doc missing or inaccessible for ${uid}/${artifactType}; recreating from folder state.`,
        );
      }
    }

    const existingDoc = await findExistingArtifactDoc(folderId, title);
    if (existingDoc?.id) {
      await gws.updateFileMetadata(existingDoc.id, { name: title });
      await gws.clearDocumentBody(existingDoc.id);
      await gws.batchUpdate(existingDoc.id, requests);
      await archiveDuplicateDocs(folderId, title, existingDoc.id);

      const docUrl = `https://docs.google.com/document/d/${existingDoc.id}/edit`;
      await upsertDocRegistryEntry(db, uid, artifactType, {
        google_doc_id: existingDoc.id,
        google_doc_url: docUrl,
        drive_folder_id: folderId,
        artifact_version: version,
        last_synced_at: new Date().toISOString(),
        shared_with: clientMeta.email ? [clientMeta.email] : [],
        status: 'synced',
        error_detail: null,
      });

      return { status: 'reused', google_doc_id: existingDoc.id, google_doc_url: docUrl };
    }

    // Create new doc directly in client folder
    const { documentId } = await gws.createDocument(title, folderId);

    // Apply template content
    await gws.batchUpdate(documentId, requests);

    // Share with user
    if (clientMeta.email) {
      try {
        await gws.shareWithUser(documentId, clientMeta.email, 'writer');
      } catch (error) {
        if (!String(error?.message || '').toLowerCase().includes('already')) {
          throw error;
        }
      }
    }

    // Record in registry
    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    await upsertDocRegistryEntry(db, uid, artifactType, {
      google_doc_id: documentId,
      google_doc_url: docUrl,
      drive_folder_id: folderId,
      artifact_version: version,
      last_synced_at: new Date().toISOString(),
      shared_with: clientMeta.email ? [clientMeta.email] : [],
      status: 'synced',
      error_detail: null,
    });

    return { status: 'created', google_doc_id: documentId, google_doc_url: docUrl };
  } catch (err) {
    await markDocRegistryError(db, uid, artifactType, err.message);
    throw err;
  }
};

/**
 * Sync a single artifact (public API for individual artifact updates).
 */
export const syncSingleArtifactToDoc = async (db, uid, artifactType, content, version) => {
  if (process.env.GWS_DOCS_ENABLED !== 'true') return { status: 'disabled' };
  if (!hasTemplate(artifactType)) return { status: 'unsupported_type' };

  const clientData = await resolveClientIdentity(db, uid);
  const clientMeta = {
    displayName: getClientDisplayName(clientData),
    email: clientData.email || '',
  };

  const folderId = await ensureClientFolder(db, uid);
  return syncSingleArtifact(db, uid, artifactType, { content, version }, clientMeta, folderId);
};
