import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

type FirebasePublicConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  databaseURL?: string;
};

function readRuntimeConfig(): FirebasePublicConfig | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (window as { __FIREBASE_CONFIG__?: FirebasePublicConfig }).__FIREBASE_CONFIG__ ?? null;
}

function resolveConfigValue(value?: string, fallback?: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : fallback;
}

function getFirebaseConfig() {
  const runtimeConfig = readRuntimeConfig();
  return {
    apiKey: resolveConfigValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, runtimeConfig?.apiKey),
    authDomain: resolveConfigValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, runtimeConfig?.authDomain),
    projectId: resolveConfigValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, runtimeConfig?.projectId),
    storageBucket: resolveConfigValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, runtimeConfig?.storageBucket),
    messagingSenderId: resolveConfigValue(
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      runtimeConfig?.messagingSenderId,
    ),
    appId: resolveConfigValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, runtimeConfig?.appId),
    databaseURL: resolveConfigValue(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, runtimeConfig?.databaseURL),
  };
}

export function isFirebaseConfigured() {
  const firebaseConfig = getFirebaseConfig();
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.databaseURL &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId,
  );
}

export function getFirebaseApp() {
  const firebaseConfig = getFirebaseConfig();
  if (!isFirebaseConfigured()) {
    return null;
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseRtdb() {
  const app = getFirebaseApp();
  return app ? getDatabase(app) : null;
}

export function getFirebaseDb() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export const auth = null;
export const rtdb = null;
export const db = null;
