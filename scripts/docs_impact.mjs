#!/usr/bin/env node

const args = process.argv.slice(2);

const rules = [
  {
    match: /(^|\/)api\//,
    docs: ['docs/career-concierge-os.md', 'docs/operations-runbook.md'],
    reason: 'API routes, auth, or model orchestration changed.',
  },
  {
    match: /(^|\/)services\/firebase\.ts$/,
    docs: ['README.md', 'docs/career-concierge-os.md', 'docs/ssai-production-migration.md'],
    reason: 'Firebase project or client configuration changed.',
  },
  {
    match: /(^|\/)components\/AdminConsole\.tsx$/,
    docs: ['docs/career-concierge-os.md', 'docs/operations-runbook.md'],
    reason: 'Admin operating model changed.',
  },
  {
    match: /(^|\/)components\/GeminiLivePanel\.tsx$/,
    docs: ['README.md', 'docs/career-concierge-os.md'],
    reason: 'Live interaction surface changed.',
  },
  {
    match: /(^|\/)scripts\/deploy_.*|(^|\/)scripts\/migrate_.*|(^|\/)scripts\/send_password_reset_emails\.mjs$/,
    docs: ['docs/operations-runbook.md', 'docs/ssai-production-migration.md', 'README.md'],
    reason: 'Deployment or migration procedure changed.',
  },
  {
    match: /(^|\/)firestore.*rules$|(^|\/)firebase\.json$/,
    docs: ['docs/operations-runbook.md', 'docs/ssai-production-migration.md'],
    reason: 'Firestore rules or project wiring changed.',
  },
  {
    match: /(^|\/)components\//,
    docs: ['docs/career-concierge-os.md'],
    reason: 'User-facing module behavior or structure changed.',
  },
];

if (args.length === 0) {
  console.log(JSON.stringify({
    usage: 'node scripts/docs_impact.mjs <changed-file> [more-files...]',
    baselineDocs: [
      'README.md',
      'docs/career-concierge-os.md',
      'docs/operations-runbook.md',
      'docs/ssai-production-migration.md',
      'docs/documentation-map.md',
    ],
  }, null, 2));
  process.exit(0);
}

const impacts = new Map();
for (const file of args) {
  for (const rule of rules) {
    if (!rule.match.test(file)) continue;
    for (const doc of rule.docs) {
      if (!impacts.has(doc)) impacts.set(doc, new Set());
      impacts.get(doc).add(`${file}: ${rule.reason}`);
    }
  }
}

console.log(JSON.stringify({
  changedFiles: args,
  impactedDocs: Array.from(impacts.entries()).map(([doc, reasons]) => ({
    doc,
    reasons: Array.from(reasons),
  })),
}, null, 2));
