import { UserRole } from "@/lib/types";

export interface DemoSession {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
}

interface DemoAccount extends DemoSession {
  password: string;
}

const DEMO_PASSWORD = "AuraDemo123!";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    uid: "demo-student-1",
    email: "student@demo.aura",
    role: "student",
    displayName: "Student Demo",
    password: DEMO_PASSWORD,
  },
  {
    uid: "demo-parent-1",
    email: "parent@demo.aura",
    role: "parent",
    displayName: "Parent Demo",
    password: DEMO_PASSWORD,
  },
  {
    uid: "demo-instructor-1",
    email: "instructor@demo.aura",
    role: "instructor",
    displayName: "Instructor Demo",
    password: DEMO_PASSWORD,
  },
  {
    uid: "demo-admin-1",
    email: "admin@demo.aura",
    role: "admin",
    displayName: "Admin Demo",
    password: DEMO_PASSWORD,
  },
];

export const DEMO_AUTH_SESSION_KEY = "aura_demo_session";
export const DEMO_AUTH_EVENT = "aura-demo-auth-changed";

function isRole(value: unknown): value is UserRole {
  return (
    value === "student" ||
    value === "parent" ||
    value === "instructor" ||
    value === "admin"
  );
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function dispatchDemoAuthUpdate() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(DEMO_AUTH_EVENT));
}

export function findDemoAccount(email: string, password: string): DemoSession | null {
  const normalizedEmail = normalizeEmail(email);
  const account = DEMO_ACCOUNTS.find(
    (item) => item.email === normalizedEmail && item.password === password,
  );

  if (!account) {
    return null;
  }

  return {
    uid: account.uid,
    email: account.email,
    role: account.role,
    displayName: account.displayName,
  };
}

export function getDemoSession(): DemoSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(DEMO_AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DemoSession>;
    if (
      typeof parsed.uid !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.displayName !== "string" ||
      !isRole(parsed.role)
    ) {
      return null;
    }

    return {
      uid: parsed.uid,
      email: normalizeEmail(parsed.email),
      role: parsed.role,
      displayName: parsed.displayName,
    };
  } catch {
    return null;
  }
}

export function setDemoSession(session: DemoSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DEMO_AUTH_SESSION_KEY, JSON.stringify(session));
  dispatchDemoAuthUpdate();
}

export function clearDemoSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(DEMO_AUTH_SESSION_KEY);
  dispatchDemoAuthUpdate();
}
