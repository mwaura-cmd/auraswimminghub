import fs from "node:fs/promises";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
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

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const databaseURL = process.env.FIREBASE_ADMIN_DATABASE_URL ?? process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

if (!projectId || !clientEmail || !privateKey || !databaseURL) {
  throw new Error("Missing Firebase admin credentials in .env.local");
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      databaseURL,
    });

const auth = getAuth(app);
const rtdb = getDatabase(app);

const users = [
  {
    email: "auraswimminghub@gmail.com",
    password: "AuraTest123!",
    role: "admin",
    displayName: "Aura Admin",
  },
  {
    email: "mwauradenis96@gmail.com",
    password: "AuraTest123!",
    role: "instructor",
    displayName: "Instructor Demo",
  },
  {
    email: "student@demo.aura",
    password: "AuraTest123!",
    role: "student",
    displayName: "Student Demo",
  },
  {
    email: "parent@demo.aura",
    password: "AuraTest123!",
    role: "parent",
    displayName: "Parent Demo",
  },
];

for (const user of users) {
  let record;
  try {
    record = await auth.getUserByEmail(user.email);
    await auth.updateUser(record.uid, {
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      emailVerified: true,
      disabled: false,
    });
  } catch {
    record = await auth.createUser({
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      emailVerified: true,
      disabled: false,
    });
  }

  await rtdb.ref(`users/${record.uid}`).set({
    uid: record.uid,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    childrenIds: [],
    createdAt: new Date().toISOString(),
  });

  console.log(`${user.role}: ${user.email}`);
}
