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

const ARTIFACT_TITLES = {
  brief: 'The Brief',
  suite_distilled: 'Your Suite, Distilled',
  profile: 'Your Profile',
  ai_profile: 'Your AI Profile',
  gaps: 'Your Gaps',
  readiness: 'AI Readiness Assessment',
  cjs_execution: 'ConciergeJobSearch Execution',
  plan: 'Your Plan',
};

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
const seedArtifacts = !hasFlag('no-artifacts');
const seedAssets = !hasFlag('no-assets');
const seedInteractions = !hasFlag('no-interactions');
const markIntroSeen = !hasFlag('no-intro-seen');

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
const toList = (value) => (Array.isArray(value) ? value.map((entry) => toString(entry)).filter(Boolean) : []);
const toLower = (value) => toString(value).toLowerCase();
const textOr = (value, fallback) => {
  const next = toString(value);
  return next || fallback;
};

const roleFromAnswers = (answers) =>
  textOr(answers.current_title, textOr(answers.current_or_target_job_title, 'Career Operator'));
const targetFromAnswers = (answers) =>
  textOr(answers.target, textOr(answers.current_or_target_job_title, 'Next-level role'));
const industryFromAnswers = (answers) => textOr(answers.industry, 'Cross-industry');

const tierRecommendationFromAnswers = (answers) => {
  const usage = toLower(answers.ai_usage_frequency);
  if (usage === 'daily') return 'Premier';
  if (usage === 'regularly' || usage === 'occasionally') return 'Select';
  return 'Foundation';
};

const composeBriefContent = (persona) => {
  const answers = persona.answers || {};
  const role = roleFromAnswers(answers);
  const target = targetFromAnswers(answers);
  const constraints = textOr(answers.constraints, 'Time and competing priorities.');
  const outcomes = toList(answers.outcomes_goals);

  return {
    learned: [
      `${persona.name} is operating as ${role} in ${industryFromAnswers(answers)}.`,
      `Primary direction is to move toward ${target}.`,
      `Key pressure line: ${constraints}`,
    ],
    needle: [
      outcomes[0] ? `Prioritize ${outcomes[0].toLowerCase()} through focused weekly execution.` : 'Prioritize visible weekly execution.',
      'Use AI to compress planning-to-output cycle time under pressure.',
      'Turn narrative quality into measurable career leverage.',
    ],
    next_72_hours: [
      { id: 'n72-01', label: 'Clarify one role narrative and one measurable outcome.', done: false },
      { id: 'n72-02', label: 'Ship one artifact that demonstrates strategic signal.', done: false },
      { id: 'n72-03', label: 'Run one feedback loop with a trusted stakeholder.', done: false },
    ],
  };
};

const composeSuiteDistilledContent = (brief) => ({
  what_i_learned: brief.learned,
  what_needs_to_happen: brief.needle,
  next_to_do: brief.next_72_hours,
});

const composePlanContent = (persona) => {
  const answers = persona.answers || {};
  const target = targetFromAnswers(answers);

  return {
    next_72_hours: [
      { id: 'p72-01', label: `Define your "${target}" transition narrative in three bullets.`, done: false },
      { id: 'p72-02', label: 'Refine one reusable AI workflow for your highest-friction task.', done: false },
      { id: 'p72-03', label: 'Schedule two high-signal conversations tied to your target direction.', done: false },
    ],
    next_2_weeks: {
      goal: `Build sustained momentum toward ${target}.`,
      cadence: [
        'Daily: 15-minute narrative + signal review.',
        'Weekly: two high-signal outreach messages.',
        'Bi-weekly: artifact quality review and iteration pass.',
      ],
    },
    needs_from_you: [
      'Keep constraints explicit so recommendations stay realistic.',
      'Document one applied win each week.',
      'Protect two focus blocks per week for execution.',
    ],
  };
};

const profileByArchetype = {
  skill_sharpener: {
    strengths: ['Structured operator under complexity', 'Strong cross-functional communication', 'Reliable strategic follow-through'],
    patterns: ['Template-driven execution', 'High ownership in ambiguity', 'Responds well to clear operating systems'],
    leverage: ['Translate AI capability into executive trust', 'Use reusable frameworks for velocity', 'Build visible internal impact proofs'],
  },
  career_accelerator: {
    strengths: ['Promotion-focused execution', 'Business-case framing', 'Stakeholder influence through outcomes'],
    patterns: ['Action bias toward measurable wins', 'Needs crisp ROI framing', 'Thrives with short execution cycles'],
    leverage: ['Attach every initiative to KPI impact', 'Build internal sponsor map', 'Convert wins into advancement narrative'],
  },
  direction_seeker: {
    strengths: ['Transferable project leadership', 'Collaborative operating style', 'High adaptability under change'],
    patterns: ['Confidence rises with guided structure', 'Needs role-path clarity', 'Learns through interactive feedback'],
    leverage: ['Translate current skills into tech language', 'Use concierge guidance for decision confidence', 'Build role-fit evidence quickly'],
  },
  free_course_user: {
    strengths: ['High curiosity and learning momentum', 'Low-ego experimentation', 'Fast foundational uptake'],
    patterns: ['Needs clear sequencing', 'Benefits from short practical modules', 'Responds to visible progression'],
    leverage: ['Build foundational AI fluency rapidly', 'Create early portfolio signals', 'Use free track as upgrade runway'],
  },
};

const composeProfileContent = (persona) => {
  const mapped = profileByArchetype[toString(persona.archetype)] || profileByArchetype.skill_sharpener;
  return {
    strengths: mapped.strengths,
    patterns: mapped.patterns,
    leverage: mapped.leverage,
  };
};

const composeAIProfileContent = (persona) => {
  const answers = persona.answers || {};
  const usage = textOr(answers.ai_usage_frequency, 'Unknown').toLowerCase();

  return {
    positioning: `${persona.name} should use AI as a decision and execution multiplier, not a replacement for judgment.`,
    how_to_use_ai: [
      'Turn vague problems into constrained prompts with explicit outputs.',
      'Use AI for first drafts, then apply human editing for strategic precision.',
      'Build repeatable workflows for recurring high-friction tasks.',
    ],
    guardrails: [
      `Current usage pattern: ${usage}. Increase usage gradually with measurable outcomes.`,
      'Never present unverified AI output as final stakeholder-ready truth.',
      'Keep sensitive context scoped and intentionally redacted when needed.',
    ],
  };
};

const composeGapsContent = (persona) => {
  const answers = persona.answers || {};
  const target = targetFromAnswers(answers);

  return {
    near_term: [
      'Sharpen strategic narrative for current and target role.',
      'Increase consistency of AI-assisted execution rhythm.',
      'Reduce context-switching by codifying weekly priorities.',
    ],
    for_target_role: [
      `Demonstrate role-level signal expected for ${target}.`,
      'Show evidence of systems thinking and stakeholder influence.',
      'Operationalize decision support with measurable outcomes.',
    ],
    constraints: [textOr(answers.constraints, 'Time constraints require disciplined prioritization.')],
  };
};

const composeReadinessContent = (persona) => {
  const answers = persona.answers || {};
  const tier = tierRecommendationFromAnswers(answers);

  return {
    executive_overview: [
      `${persona.name} currently operates with ${textOr(answers.ai_usage_frequency, 'unknown')} AI usage frequency.`,
      `Career direction centers on ${targetFromAnswers(answers)}.`,
      `Primary leverage opportunity is ${textOr(answers.work_style, 'structured')} execution under constraint.`,
    ],
    from_awareness_to_action: [
      'Convert goals into weekly measurable deliverables.',
      'Apply one focused AI workflow per business-critical task lane.',
      'Track outcomes and iterate narrative quality every week.',
    ],
    targeted_ai_development_priorities: [
      'Prompt design under real-world constraints.',
      'Decision-support workflow integration.',
      'Stakeholder-ready communication with AI-assisted drafting.',
    ],
    technical_development_areas: [
      'Model/tool selection by task type and risk profile.',
      'Workflow instrumentation and signal tracking.',
      'Artifact quality review loop for continuous improvement.',
    ],
    tier_recommendation: tier,
  };
};

const composeCjsExecutionContent = (persona) => {
  const answers = persona.answers || {};
  const intent = toString(persona.intent);
  const target = targetFromAnswers(answers);
  const forSearch = intent === 'target_role';

  return {
    intent_summary: forSearch
      ? `Active transition toward ${target} with execution support.`
      : `CJS visible for readiness, but primary focus remains ${roleFromAnswers(answers)} performance elevation.`,
    stages: [
      {
        step: 1,
        title: 'Resume Intake',
        status: forSearch ? 'ready' : 'planned',
        description: 'Capture latest resume and target role context.',
      },
      {
        step: 2,
        title: 'Role Narrative Alignment',
        status: forSearch ? 'ready' : 'planned',
        description: 'Align role story to target responsibilities and business outcomes.',
      },
      {
        step: 3,
        title: 'Search Strategy',
        status: forSearch ? 'ready' : 'blocked',
        description: forSearch
          ? 'Build outreach and opportunity pipeline across high-signal channels.'
          : 'Held until user switches into active transition mode.',
      },
      {
        step: 4,
        title: 'Interview + Negotiation Prep',
        status: forSearch ? 'planned' : 'blocked',
        description: 'Prepare scripts, response frameworks, and leverage narratives.',
      },
    ],
  };
};

const buildHydratedArtifacts = (persona) => {
  const brief = composeBriefContent(persona);
  return {
    brief,
    suite_distilled: composeSuiteDistilledContent(brief),
    plan: composePlanContent(persona),
    profile: composeProfileContent(persona),
    ai_profile: composeAIProfileContent(persona),
    gaps: composeGapsContent(persona),
    readiness: composeReadinessContent(persona),
    cjs_execution: composeCjsExecutionContent(persona),
  };
};

const buildAssets = (persona) => {
  const answers = persona.answers || {};
  const target = targetFromAnswers(answers);
  const baseAssets = [
    {
      id: 'asset-01-profile-narrative',
      label: 'Profile Narrative v1',
      type: 'narrative',
      status: 'draft',
      summary: `Core narrative for transition toward ${target}.`,
    },
    {
      id: 'asset-02-weekly-plan',
      label: 'Weekly Execution Plan',
      type: 'plan',
      status: 'active',
      summary: 'Operational cadence for 72-hour and 2-week execution.',
    },
  ];

  if (toString(persona.id) === 'TU2') {
    baseAssets.push(
      {
        id: 'asset-03-resume-core',
        label: 'Resume Core',
        type: 'resume',
        status: 'active',
        summary: 'Baseline resume for Director of Marketing positioning.',
      },
      {
        id: 'asset-04-resume-vertical',
        label: 'Resume Vertical Variant',
        type: 'resume',
        status: 'draft',
        summary: 'Variant tailored to industry-specific Director roles.',
      },
      {
        id: 'asset-05-resume-internal',
        label: 'Resume Internal Promotion Variant',
        type: 'resume',
        status: 'draft',
        summary: 'Variant optimized for internal promotion narrative.',
      }
    );
  }

  return baseAssets;
};

const buildInteractionSeed = (persona) => {
  const answers = persona.answers || {};
  return {
    id: `seed-${toString(persona.id).toLowerCase()}`,
    type: 'chief_of_staff_summary',
    status: 'logged',
    summary: `Seeded concierge summary for ${persona.name}. Target direction: ${targetFromAnswers(answers)}.`,
    next_actions: [
      'Review The Brief for narrative alignment.',
      'Execute first 72-hour action with evidence capture.',
      'Return to update progress after first execution cycle.',
    ],
  };
};

const getUserSafe = async (lookup) => {
  try {
    return await lookup();
  } catch (error) {
    if (error?.code === 'auth/user-not-found') return null;
    throw error;
  }
};

const resolveAuthIdentity = async ({ uid, email, name, tier, personaId, password, dryRunMode, authEnabled }) => {
  const notes = [];
  let authAction = 'skipped';

  const byUid = await getUserSafe(() => admin.auth().getUser(uid));
  const byEmail = await getUserSafe(() => admin.auth().getUserByEmail(email));

  let resolvedUid = uid;
  if (byUid?.uid) {
    resolvedUid = byUid.uid;
  } else if (byEmail?.uid) {
    resolvedUid = byEmail.uid;
    if (resolvedUid !== uid) {
      notes.push(`uid_reconciled_to_existing_email_uid:${resolvedUid}`);
    }
  }

  if (!authEnabled) {
    if (byUid || byEmail) {
      authAction = 'resolved_existing';
    }
    return { resolvedUid, authAction, notes };
  }

  if (dryRunMode) {
    authAction = byUid || byEmail ? 'would_update' : 'would_create';
    return { resolvedUid, authAction, notes };
  }

  if (byUid || byEmail) {
    await admin.auth().updateUser(resolvedUid, {
      email,
      displayName: name,
      password,
      emailVerified: true,
      disabled: false,
    });
    authAction = 'updated';
  } else {
    await admin.auth().createUser({
      uid: resolvedUid,
      email,
      displayName: name,
      password,
      emailVerified: true,
      disabled: false,
    });
    authAction = 'created';
  }

  const current = await admin.auth().getUser(resolvedUid);
  const claims = {
    ...(current.customClaims || {}),
    demo_user: true,
    persona_id: personaId,
    tier,
  };
  await admin.auth().setCustomUserClaims(resolvedUid, claims);

  return { resolvedUid, authAction, notes };
};

const upsertClientDoc = async ({ db, uid, email, persona, source, dryRunMode }) => {
  const ref = db.collection('clients').doc(uid);
  const answers = persona.answers || {};
  const payload = {
    uid,
    email,
    display_name: toString(persona.name),
    intent: toString(persona.intent) || 'current_role',
    preferences: {
      pace: toString(persona?.preferences?.pace) || 'standard',
      focus: toString(persona?.preferences?.focus) || 'skills',
    },
    intro_seen_at: markIntroSeen ? FieldValue.serverTimestamp() : null,
    intake: {
      answers,
      completed_at: FieldValue.serverTimestamp(),
      source: source || 'docs/mvp/test_user_specs.md',
    },
    demo_profile: {
      id: toString(persona.id),
      name: toString(persona.name),
      archetype: toString(persona.archetype),
      tier: toString(persona.tier),
      hydrated: true,
      hydrated_at: nowIso(),
      source: source || 'docs/mvp/test_user_specs.md',
    },
    account: {
      status: 'active',
      hydrated: true,
      hydrated_at: nowIso(),
    },
    updated_at: FieldValue.serverTimestamp(),
  };

  if (dryRunMode) return { action: 'would_upsert' };

  const snap = await ref.get();
  if (!snap.exists) {
    payload.created_at = FieldValue.serverTimestamp();
  }
  await ref.set(payload, { merge: true });
  return { action: snap.exists ? 'updated' : 'created' };
};

const upsertArtifacts = async ({ db, uid, persona, source, dryRunMode }) => {
  const artifacts = buildHydratedArtifacts(persona);
  if (dryRunMode) {
    return Object.keys(artifacts).map((type) => ({ type, action: 'would_upsert' }));
  }

  const out = [];
  for (const [type, content] of Object.entries(artifacts)) {
    const ref = db.collection('clients').doc(uid).collection('artifacts').doc(type);
    const snap = await ref.get();
    const currentVersion = Number(snap.data()?.version || 0);
    const payload = {
      type,
      title: ARTIFACT_TITLES[type] || type,
      version: currentVersion + 1,
      content,
      updated_at: FieldValue.serverTimestamp(),
      created_at: snap.exists ? snap.data()?.created_at || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      meta: {
        seeded: true,
        source: source || 'docs/mvp/test_user_specs.md',
        seeded_at: nowIso(),
      },
    };
    await ref.set(payload, { merge: true });
    out.push({ type, action: snap.exists ? 'updated' : 'created', version: currentVersion + 1 });
  }
  return out;
};

const upsertAssets = async ({ db, uid, persona, source, dryRunMode }) => {
  const assets = buildAssets(persona);
  if (dryRunMode) {
    return assets.map((asset) => ({ id: asset.id, action: 'would_upsert' }));
  }

  const out = [];
  for (const asset of assets) {
    const ref = db.collection('clients').doc(uid).collection('assets').doc(asset.id);
    const snap = await ref.get();
    await ref.set(
      {
        ...asset,
        source: source || 'docs/mvp/test_user_specs.md',
        updated_at: FieldValue.serverTimestamp(),
        created_at: snap.exists ? snap.data()?.created_at || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    out.push({ id: asset.id, action: snap.exists ? 'updated' : 'created' });
  }
  return out;
};

const upsertInteraction = async ({ db, uid, persona, source, dryRunMode }) => {
  const interaction = buildInteractionSeed(persona);
  if (dryRunMode) {
    return { id: interaction.id, action: 'would_upsert' };
  }

  const ref = db.collection('clients').doc(uid).collection('interactions').doc(interaction.id);
  const snap = await ref.get();
  await ref.set(
    {
      ...interaction,
      source: source || 'docs/mvp/test_user_specs.md',
      updated_at: FieldValue.serverTimestamp(),
      created_at: snap.exists ? snap.data()?.created_at || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return { id: interaction.id, action: snap.exists ? 'updated' : 'created' };
};

const seed = async () => {
  const fixtures = await loadFixtures(fixturePath);
  const effectiveProject = projectId || fixtures.project_id || '';

  if (!effectiveProject) {
    throw new Error('Project ID is required. Pass --project <gcp-project-id> or set GOOGLE_CLOUD_PROJECT/GCLOUD_PROJECT.');
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
    options: {
      seed_artifacts: seedArtifacts,
      seed_assets: seedAssets,
      seed_interactions: seedInteractions,
      mark_intro_seen: markIntroSeen,
    },
    personas: [],
  };

  for (const persona of fixtures.personas) {
    const personaId = toString(persona.id);
    const fixtureUid = toString(persona.uid);
    const email = toLower(persona.email);
    const name = toString(persona.name);

    if (!personaId || !fixtureUid || !email) {
      throw new Error(`Invalid persona fixture entry. Required: id, uid, email. Received: ${JSON.stringify(persona)}`);
    }

    const auth = await resolveAuthIdentity({
      uid: fixtureUid,
      email,
      name,
      tier: toString(persona.tier),
      personaId,
      password: sharedPassword,
      dryRunMode: dryRun,
      authEnabled: enableAuth,
    });

    const client = await upsertClientDoc({
      db,
      uid: auth.resolvedUid,
      email,
      persona,
      source: fixtures.source,
      dryRunMode: dryRun,
    });

    const artifacts = seedArtifacts
      ? await upsertArtifacts({
          db,
          uid: auth.resolvedUid,
          persona,
          source: fixtures.source,
          dryRunMode: dryRun,
        })
      : [];

    const assets = seedAssets
      ? await upsertAssets({
          db,
          uid: auth.resolvedUid,
          persona,
          source: fixtures.source,
          dryRunMode: dryRun,
        })
      : [];

    const interaction = seedInteractions
      ? await upsertInteraction({
          db,
          uid: auth.resolvedUid,
          persona,
          source: fixtures.source,
          dryRunMode: dryRun,
        })
      : null;

    report.personas.push({
      id: personaId,
      name,
      email,
      uid_fixture: fixtureUid,
      uid_resolved: auth.resolvedUid,
      auth_action: auth.authAction,
      client_action: client.action,
      artifacts,
      assets,
      interaction,
      notes: auth.notes,
    });
  }

  await ensureDirectory(outputPath);
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
};

seed().catch((error) => {
  console.error(`Persona fixture seed failed: ${error?.message || error}`);
  process.exit(1);
});
