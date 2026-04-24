import fs from "node:fs/promises";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const TEST_NAME_PATTERNS = [/^streak\s+(seed|test)/i, /\be2e\b/i, /^test learner$/i, /^admin test learner$/i];

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    all: argv.includes("--all"),
  };
}

async function loadEnvFromDotLocal() {
  const envText = await fs.readFile(new URL("../.env.local", import.meta.url), "utf8");

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function isTemporaryTestBooking(booking) {
  const learnerName = typeof booking.learnerName === "string" ? booking.learnerName.trim() : "";
  const fullName = typeof booking.fullName === "string" ? booking.fullName.trim() : "";
  const notes = typeof booking.notes === "string" ? booking.notes.trim() : "";

  if (TEST_NAME_PATTERNS.some((pattern) => pattern.test(learnerName))) {
    return true;
  }

  if (/\be2e\b/i.test(fullName) || /\bstreak\s*seed\b/i.test(notes)) {
    return true;
  }

  return false;
}

function getAdminApp() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseURL = process.env.FIREBASE_ADMIN_DATABASE_URL ?? process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    throw new Error("Missing Firebase admin credentials in .env.local");
  }

  return getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        databaseURL,
      });
}

async function run() {
  const { apply, all } = parseArgs(process.argv.slice(2));
  await loadEnvFromDotLocal();

  const app = getAdminApp();
  const rtdb = getDatabase(app);
  const bookingsRef = rtdb.ref("bookings");
  const snapshot = await bookingsRef.get();

  if (!snapshot.exists()) {
    console.log("No bookings found.");
    return;
  }

  const data = snapshot.val();
  const entries = Object.entries(data).map(([id, booking]) => ({ id, booking }));

  const matches = all ? entries : entries.filter(({ booking }) => isTemporaryTestBooking(booking));

  if (matches.length === 0) {
    console.log(all ? "No bookings found to delete." : "No temporary test bookings matched cleanup patterns.");
    return;
  }

  console.log(all ? `Matched ${matches.length} booking(s) for full cleanup:` : `Matched ${matches.length} temporary test booking(s):`);
  for (const { id, booking } of matches) {
    const learner = booking.learnerName ?? "(unknown learner)";
    const when = `${booking.date ?? "?"} ${booking.time ?? "?"}`;
    console.log(`- ${id}: ${learner} @ ${when}`);
  }

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to delete matched bookings.");
    return;
  }

  await Promise.all(matches.map(({ id }) => rtdb.ref(`bookings/${id}`).set(null)));
  console.log(`Deleted ${matches.length} temporary test booking(s).`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
