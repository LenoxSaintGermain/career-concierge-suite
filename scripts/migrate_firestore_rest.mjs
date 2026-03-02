#!/usr/bin/env node

const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, ...rest] = entry.split('=');
    return [key.replace(/^--/, ''), rest.join('=')];
  })
);

const sourceProject = args.get('source-project');
const targetProject = args.get('target-project');
const sourceDb = args.get('source-db') || 'career-concierge';
const targetDb = args.get('target-db') || 'career-concierge';
const sourceToken = process.env.SOURCE_FIRESTORE_TOKEN;
const targetToken = process.env.TARGET_FIRESTORE_TOKEN;

if (!sourceProject || !targetProject) {
  console.error(
    'Usage: node scripts/migrate_firestore_rest.mjs --source-project=<id> --target-project=<id> [--source-db=career-concierge] [--target-db=career-concierge]'
  );
  process.exit(1);
}

if (!sourceToken || !targetToken) {
  console.error('Missing SOURCE_FIRESTORE_TOKEN or TARGET_FIRESTORE_TOKEN environment variable.');
  process.exit(1);
}

const sourceBase = `https://firestore.googleapis.com/v1/projects/${sourceProject}/databases/${sourceDb}/documents`;
const targetBase = `https://firestore.googleapis.com/v1/projects/${targetProject}/databases/${targetDb}/documents`;

const rootCollections = ['system', 'clients'];

const getJson = async (url, token, init = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${body}`);
  }

  return response.status === 204 ? null : response.json();
};

const listDocuments = async (collectionPath) => {
  const encoded = collectionPath ? `/${collectionPath}` : '';
  const url = `${sourceBase}${encoded}?pageSize=1000`;
  const payload = await getJson(url, sourceToken, { method: 'GET' });
  return payload?.documents ?? [];
};

const listSubcollections = async (documentRelativePath) => {
  const url = `${sourceBase}/${documentRelativePath}:listCollectionIds`;
  const payload = await getJson(url, sourceToken, {
    method: 'POST',
    body: JSON.stringify({ pageSize: 100 }),
  });
  return payload?.collectionIds ?? [];
};

const writeDocument = async (documentRelativePath, fields = {}) => {
  const url = `${targetBase}/${documentRelativePath}`;
  await getJson(url, targetToken, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
};

const stripPrefix = (fullName, projectId, databaseId) => {
  const prefix = `projects/${projectId}/databases/${databaseId}/documents/`;
  if (!fullName.startsWith(prefix)) {
    throw new Error(`Unexpected document name: ${fullName}`);
  }
  return fullName.slice(prefix.length);
};

const migrateCollection = async (collectionPath) => {
  const documents = await listDocuments(collectionPath);
  for (const document of documents) {
    const relativePath = stripPrefix(document.name, sourceProject, sourceDb);
    await writeDocument(relativePath, document.fields ?? {});
    console.log(`migrated ${relativePath}`);

    const subcollections = await listSubcollections(relativePath);
    for (const subcollection of subcollections) {
      await migrateCollection(`${relativePath}/${subcollection}`);
    }
  }
};

for (const collection of rootCollections) {
  await migrateCollection(collection);
}

console.log('Firestore REST migration complete.');
