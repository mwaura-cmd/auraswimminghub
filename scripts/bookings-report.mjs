import fs from "node:fs/promises";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

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
  await loadEnvFromDotLocal();
  const app = getAdminApp();
  const rtdb = getDatabase(app);

  const snapshot = await rtdb.ref("bookings").get();
  if (!snapshot.exists()) {
    console.log("No bookings found.");
    return;
  }

  const entries = Object.entries(snapshot.val())
    .map(([id, booking]) => ({ id, booking }))
    .sort((a, b) => {
      const aTime = new Date(a.booking.createdAt ?? 0).getTime();
      const bTime = new Date(b.booking.createdAt ?? 0).getTime();
      return bTime - aTime;
    });

  const statusCounts = entries.reduce(
    (acc, item) => {
      const status = item.booking.status ?? "unknown";
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    {},
  );

  console.log("Status counts:", statusCounts);

  const withReference = entries.filter((item) => typeof item.booking.paystackReference === "string" && item.booking.paystackReference);
  console.log(`Bookings with paystackReference: ${withReference.length}`);

  for (const { id, booking } of entries.slice(0, 20)) {
    console.log(
      [
        id,
        booking.status ?? "unknown",
        booking.learnerName ?? "(unknown learner)",
        booking.email ?? "(no email)",
        booking.program ?? "(no program)",
        booking.paystackReference ?? "(no reference)",
        booking.createdAt ?? "(no createdAt)",
      ].join(" | "),
    );
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
