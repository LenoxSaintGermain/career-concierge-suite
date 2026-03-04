#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    exportFile: ".context/auth-export-ssai.json",
    apiKey: "",
    send: false,
    output: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--export-file") {
      args.exportFile = argv[++i] ?? args.exportFile;
      continue;
    }
    if (arg === "--api-key") {
      args.apiKey = argv[++i] ?? "";
      continue;
    }
    if (arg === "--output") {
      args.output = argv[++i] ?? "";
      continue;
    }
    if (arg === "--send") {
      args.send = true;
      continue;
    }
    if (arg === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/send_password_reset_emails.mjs [options]

Options:
  --export-file <path>  Firebase auth export JSON file
  --api-key <key>       Target Firebase web API key
  --output <path>       Optional JSON report output path
  --send                Actually send password reset emails
  --help                Show this help text

Default mode is dry-run. It only reports which imported users require reset.`);
}

function loadPasswordUsers(exportFile) {
  const raw = fs.readFileSync(exportFile, "utf8");
  const parsed = JSON.parse(raw);
  const users = Array.isArray(parsed.users) ? parsed.users : [];

  return users
    .filter((user) => (user.passwordHash || user.passwordSalt) && user.email)
    .map((user) => ({
      uid: user.localId,
      email: user.email,
    }));
}

async function sendResetEmail(apiKey, email) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requestType: "PASSWORD_RESET",
      email,
    }),
  });

  const body = await response.text();
  let parsed;
  try {
    parsed = body ? JSON.parse(body) : {};
  } catch {
    parsed = { raw: body };
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsed,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const exportFile = path.resolve(args.exportFile);
  const users = loadPasswordUsers(exportFile);

  const report = {
    exportFile,
    totalPasswordUsers: users.length,
    sendMode: args.send,
    users: [],
  };

  if (args.send && !args.apiKey) {
    throw new Error("--api-key is required with --send");
  }

  for (const user of users) {
    if (!args.send) {
      report.users.push({
        ...user,
        status: "pending_reset",
      });
      continue;
    }

    const result = await sendResetEmail(args.apiKey, user.email);
    report.users.push({
      ...user,
      status: result.ok ? "sent" : "failed",
      responseStatus: result.status,
      responseBody: result.body,
    });
  }

  const json = JSON.stringify(report, null, 2);
  console.log(json);

  if (args.output) {
    fs.writeFileSync(path.resolve(args.output), `${json}\n`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
