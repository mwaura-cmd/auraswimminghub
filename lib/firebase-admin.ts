import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

function getAdminApp() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseURL = process.env.FIREBASE_ADMIN_DATABASE_URL ?? process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    return null;
  }

  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL,
  });
}

export function getAdminRtdb() {
  const app = getAdminApp();
  if (!app) {
    return null;
  }

  return getDatabase(app);
}

export function getAdminAuth() {
  const app = getAdminApp();
  if (!app) {
    return null;
  }

  return getAuth(app);
}
