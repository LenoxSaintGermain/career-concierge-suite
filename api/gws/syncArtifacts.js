import * as gws from './gwsClient.js';
import { getDocRegistryEntry, upsertDocRegistryEntry, markDocRegistryError } from './docRegistry.js';
import { ensureClientFolder, getClientDisplayName, getDocTitle, resolveClientIdentity } from './driveOrganizer.js';
import { buildDocRequests, hasTemplate } from './templateEngine.js';

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

  try {
    if (registry?.google_doc_id) {
      // Update existing doc
      await gws.updateFileMetadata(registry.google_doc_id, { name: title });
      await gws.clearDocumentBody(registry.google_doc_id);
      const requests = buildDocRequests(artifactType, content, clientMeta);
      await gws.batchUpdate(registry.google_doc_id, requests);

      await upsertDocRegistryEntry(db, uid, artifactType, {
        artifact_version: version,
        last_synced_at: new Date().toISOString(),
        status: 'synced',
        error_detail: null,
      });

      return { status: 'updated', google_doc_id: registry.google_doc_id };
    }

    // Create new doc directly in client folder
    const { documentId } = await gws.createDocument(title, folderId);

    // Apply template content
    const requests = buildDocRequests(artifactType, content, clientMeta);
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
