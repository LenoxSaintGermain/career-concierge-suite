#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const DEFAULT_FIXTURE_FILE = path.join(repoRoot, 'config', 'demo', 'persona-fixtures.json');
const DEFAULT_OUTPUT_FILE = path.join(repoRoot, '.context', 'persona-seed-report.json');

const getArgValue = (name) => {
  const prefixed = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefixed));
  if (inline) return inline.slice(prefixed.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return null;
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const fixturePath = path.resolve(getArgValue('file') || DEFAULT_FIXTURE_FILE);
const outputPath = path.resolve(getArgValue('output') || DEFAULT_OUTPUT_FILE);
const projectId = getArgValue('project') || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '';
const databaseId = getArgValue('database-id') || process.env.FIRESTORE_DATABASE_ID || 'career-concierge';
const enableAuth = hasFlag('auth');
const dryRun = hasFlag('dry-run');
const sharedPassword = getArgValue('password') || '';

if (enableAuth && !sharedPassword) {
  console.error('When using --auth you must provide --password "<temporary-password>".');
  process.exit(1);
}

const loadFixtures = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.personas) || parsed.personas.length === 0) {
    throw new Error('Fixture file is missing a non-empty `personas` array.');
  }
  return parsed;
};

const ensureDirectory = async (filePath) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

const nowIso = () => new Date().toISOString();

const toString = (value) => String(value ?? '').trim();

const seed = async () => {
  const fixtures = await loadFixtures(fixturePath);
  const effectiveProject = projectId || fixtures.project_id || '';

  if (!effectiveProject) {
    throw new Error(
      'Project ID is required. Pass --project <gcp-project-id> or set GOOGLE_CLOUD_PROJECT/GCLOUD_PROJECT.'
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: effectiveProject });
  }

  const db = getFirestore(admin.app(), databaseId);
  const report = {
    generated_at: nowIso(),
    dry_run: dryRun,
    auth_enabled: enableAuth,
    project_id: effectiveProject,
    database_id: databaseId,
    fixture_file: fixturePath,
    source: fixtures.source || '',
    personas: [],
  };

  for (const persona of fixtures.personas) {
    const id = toString(persona.id);
    const uid = toString(persona.uid);
    const email = toString(persona.email).toLowerCase();
    const name = toString(persona.name);

    if (!id || !uid || !email) {
      throw new Error(`Invalid persona fixture entry. Required: id, uid, email. Received: ${JSON.stringify(persona)}`);
    }

    const row = {
      id,
      uid,
      email,
      auth: 'skipped',
      client_doc: 'pending',
      notes: [],
    };

    if (enableAuth) {
      if (dryRun) {
        row.auth = 'would_upsert';
      } else {
        try {
          await admin.auth().getUser(uid);
          await admin.auth().updateUser(uid, {
            email,
            displayName: name,
            password: sharedPassword,
            disabled: false,
          });
          row.auth = 'updated';
        } catch (error) {
          if (error?.code !== 'auth/user-not-found') {
            throw error;
          }
          await admin.auth().createUser({
            uid,
            email,
            displayName: name,
            password: sharedPassword,
            emailVerified: true,
            disabled: false,
          });
          row.auth = 'created';
        }
      }
    }

    const ref = db.collection('clients').doc(uid);
    const docData = {
      uid,
      intent: persona.intent || 'current_role',
      preferences: {
        pace: persona?.preferences?.pace || 'standard',
        focus: persona?.preferences?.focus || 'skills',
      },
      intake: {
        answers: persona.answers || {},
        completed_at: FieldValue.serverTimestamp(),
      },
      demo_profile: {
        id,
        name,
        archetype: toString(persona.archetype),
        tier: toString(persona.tier),
        source: fixtures.source || 'docs/mvp/test_user_specs.md',
        seeded_at: nowIso(),
      },
      updated_at: FieldValue.serverTimestamp(),
    };

    if (dryRun) {
      row.client_doc = 'would_upsert';
    } else {
      const snap = await ref.get();
      if (!snap.exists) {
        docData.created_at = FieldValue.serverTimestamp();
      }
      await ref.set(docData, { merge: true });
      row.client_doc = snap.exists ? 'updated' : 'created';
    }

    report.personas.push(row);
  }

  await ensureDirectory(outputPath);
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(report, null, 2));
};

seed().catch((error) => {
  console.error(`Persona fixture seed failed: ${error?.message || error}`);
  process.exit(1);
});
