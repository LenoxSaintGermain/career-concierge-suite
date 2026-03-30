import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

const GWS_SUBJECT = process.env.GWS_IMPERSONATE_EMAIL || 'gws@conciergecareerservices.com';
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
];

let _token = null;
let _tokenExpiry = 0;

/**
 * Domain-wide delegation from Cloud Run without a key file.
 * Signs a JWT via IAM Credentials API with `sub` claim, exchanges for access token.
 */
const getDwdToken = async () => {
  if (_token && Date.now() < _tokenExpiry - 60_000) return _token;

  const baseAuth = new GoogleAuth();
  const credentials = await baseAuth.getCredentials();
  const saEmail = credentials.client_email;
  const client = await baseAuth.getClient();

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: saEmail,
    sub: GWS_SUBJECT,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  // Sign the JWT using IAM Credentials API (no key file needed)
  const iamRes = await client.request({
    url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:signJwt`,
    method: 'POST',
    data: { payload: JSON.stringify(claims) },
  });

  // Exchange signed JWT for an access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${iamRes.data.signedJwt}`,
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    throw new Error(`DWD token exchange failed: ${tokenData.error_description || tokenData.error}`);
  }

  _token = tokenData.access_token;
  _tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
  return _token;
};

/** Get an authenticated OAuth2 client with DWD. */
const getAuthClient = async () => {
  const token = await getDwdToken();
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: token });
  return oauth2;
};

const getDrive = async () => google.drive({ version: 'v3', auth: await getAuthClient() });
const getDocs = async () => google.docs({ version: 'v1', auth: await getAuthClient() });

/** Create a Google Doc inside a folder. Returns { documentId, title }. */
export const createDocument = async (title, parentId) => {
  const drv = await getDrive();
  const res = await drv.files.create({
    requestBody: {
      name: title,
      mimeType: 'application/vnd.google-apps.document',
      ...(parentId && { parents: [parentId] }),
    },
    fields: 'id,name',
  });
  return { documentId: res.data.id, title: res.data.name };
};

/** Apply a batchUpdate to a Google Doc. */
export const batchUpdate = async (documentId, requests) => {
  const d = await getDocs();
  const res = await d.documents.batchUpdate({
    documentId,
    requestBody: { requests },
  });
  return res.data;
};

/** Read a Google Doc's metadata. */
export const getDocument = async (documentId) => {
  const d = await getDocs();
  const res = await d.documents.get({ documentId });
  return res.data;
};

/** Create a Drive folder. Returns { id, name }. */
export const createFolder = async (name, parentId) => {
  const drv = await getDrive();
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) metadata.parents = [parentId];

  const res = await drv.files.create({
    requestBody: metadata,
    fields: 'id,name',
  });
  return { id: res.data.id, name: res.data.name };
};

/** Update Drive file metadata such as name. */
export const updateFileMetadata = async (fileId, metadata) => {
  const drv = await getDrive();
  const res = await drv.files.update({
    fileId,
    requestBody: metadata,
    fields: 'id,name',
  });
  return res.data;
};

/** Move a file into a folder (add parent). */
export const moveToFolder = async (fileId, folderId) => {
  const drv = await getDrive();
  const file = await drv.files.get({ fileId, fields: 'parents' });
  const previousParents = (file.data.parents || []).join(',');
  const res = await drv.files.update({
    fileId,
    addParents: folderId,
    removeParents: previousParents,
    fields: 'id,parents',
  });
  return res.data;
};

/** Share a Drive file/folder with a user. */
export const shareWithUser = async (fileId, email, role = 'writer') => {
  const drv = await getDrive();
  const res = await drv.permissions.create({
    fileId,
    requestBody: {
      type: 'user',
      role,
      emailAddress: email,
    },
  });
  return res.data;
};

/** List files inside a Drive folder. */
export const listFolderContents = async (folderId) => {
  const drv = await getDrive();
  const res = await drv.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink,appProperties)',
  });
  return res.data.files || [];
};

/** Set appProperties on a Drive file (for UID-based ownership). */
export const setAppProperties = async (fileId, properties) => {
  const drv = await getDrive();
  const res = await drv.files.update({
    fileId,
    requestBody: { appProperties: properties },
    fields: 'id,appProperties',
  });
  return res.data;
};

/** Clear all body content from a Google Doc (for re-rendering). */
export const clearDocumentBody = async (documentId) => {
  const doc = await getDocument(documentId);
  const endIndex = doc?.body?.content?.slice(-1)?.[0]?.endIndex;
  if (!endIndex || endIndex <= 2) return;

  return batchUpdate(documentId, [
    {
      deleteContentRange: {
        range: { startIndex: 1, endIndex: endIndex - 1 },
      },
    },
  ]);
};
