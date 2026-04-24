"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth, isFirebaseConfigured, rtdb } from "@/lib/firebase";
import { DEMO_ACCOUNTS, findDemoAccount, setDemoSession } from "@/lib/demo-auth";
import { ensureUserProfile, getUserProfile } from "@/lib/realtimedb";
import { ROLE_ROUTES } from "@/lib/constants";
import { normalizeRole } from "@/lib/roles";
import { UserRole } from "@/lib/types";

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 7000): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("request-timeout")), timeoutMs);
    }),
  ]);
}

async function withRetry<T>(resolver: () => Promise<T>, attempts = 4, delayMs = 250): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await resolver();
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("request-timeout");
}

function toAuthErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  if (code === "auth/operation-not-allowed") {
    return "Email/Password is disabled. Enable it in Firebase Console > Authentication > Sign-in method.";
  }

  if (code === "auth/email-already-in-use") {
    return "This email is already in use. Try logging in instead.";
  }

  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Invalid email or password.";
  }

  if (code === "auth/popup-closed-by-user") {
    return "Google sign-in was cancelled before completion.";
  }

  if (code === "auth/popup-blocked") {
    return "Browser blocked the Google sign-in popup. Allow popups and retry.";
  }

  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized in Firebase Authentication settings.";
  }

  const message = error instanceof Error ? error.message : "Authentication failed";
  if (message.toUpperCase().includes("PERMISSION_DENIED")) {
    return "Realtime Database denied access to your profile. Update RTDB rules to allow authenticated users to read users/{uid}.";
  }

  if (message.startsWith("missing-user-profile:")) {
    const uid = message.split(":")[1] ?? "unknown";
    return `User profile not found in Realtime Database. Create users/{uid} with role set to admin, instructor, parent, or student. Debug UID: ${uid}`;
  }

  if (message.includes("ERR_BLOCKED_BY_CLIENT")) {
    return "Browser shield/ad blocker is blocking Firebase requests. Disable shields for localhost and retry.";
  }

  return message;
}

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const isDemoMode = !isFirebaseConfigured || !auth || !rtdb;
  const isPublicSignup = mode === "signup" && !isDemoMode;

  const onGoogleSignIn = async () => {
    setError("");
    setBusy(true);

    try {
      if (isDemoMode) {
        throw new Error("Google sign-in is unavailable in demo mode.");
      }

      const firebaseAuth = auth!;
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(firebaseAuth, provider);

      // Wait for auth token propagation before role/profile lookups.
      await new Promise((resolve) => setTimeout(resolve, 500));

      let profile = await withRetry(() => withTimeout(getUserProfile(credential.user.uid)));
      let profileRole = normalizeRole(profile?.role);

      if (!profileRole) {
        try {
          await withTimeout(ensureUserProfile("student", { displayName: credential.user.displayName ?? "" }));
          profile = await withRetry(() => withTimeout(getUserProfile(credential.user.uid)));
          profileRole = normalizeRole(profile?.role) ?? "student";
        } catch {
          profileRole = "student";
        }
      }

      router.push(ROLE_ROUTES[profileRole]);
    } catch (err) {
      setError(toAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (isDemoMode) {
        const account = findDemoAccount(email, password);
        if (!account) {
          throw new Error("Invalid demo credentials. Use one of the demo accounts listed below.");
        }

        setDemoSession(account);
        router.push(ROLE_ROUTES[account.role]);
        return;
      }

      const firebaseAuth = auth!;

      if (mode === "signup") {
        if (role !== "student" && role !== "parent") {
          throw new Error("Only student and parent accounts can self-register.");
        }

        const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        if (name.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() });
        }

        // If profile write is blocked/slow, still allow auth success flow.
        try {
          await withTimeout(ensureUserProfile(role, { displayName: name.trim() }));
        } catch {
          // fallback handled by role defaults until RTDB is reachable
        }

        router.push(ROLE_ROUTES[role]);
      } else {
        const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);

        // Wait for auth token to propagate to RTDB connection
        await new Promise((resolve) => setTimeout(resolve, 500));

        const profile = await withRetry(() => withTimeout(getUserProfile(credential.user.uid)));
        const profileRole = normalizeRole(profile?.role);
        if (!profile || !profileRole) {
          throw new Error(`missing-user-profile:${credential.user.uid}`);
        }

        router.push(ROLE_ROUTES[profileRole]);
        if (!credential.user) {
          throw new Error("Sign in failed");
        }
      }
    } catch (err) {
      setError(toAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="glass-card mx-auto w-full max-w-md rounded-3xl p-7">
      <h1 className="text-3xl">{isDemoMode ? "Demo Login" : mode === "login" ? "Login" : "Create Account"}</h1>
      <p className="mt-2 text-sm text-teal-50/70">
        {isDemoMode
          ? "Firebase is not configured, so demo credentials are enabled for local testing."
          : "Access portal dashboards by role."}
      </p>

      <div className="mt-6 space-y-4">
        {!isDemoMode && mode === "signup" && (
          <input
            placeholder="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3"
          required
        />

        {!isDemoMode && mode === "signup" && (
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="w-full rounded-xl border border-teal-500/30 bg-black/70 p-3"
          >
            <option value="student">student</option>
            <option value="parent">parent</option>
          </select>
        )}

        {isPublicSignup && (
          <p className="text-xs text-teal-100/70">
            Instructor and admin accounts are provisioned by academy administrators.
          </p>
        )}

        {isDemoMode && (
          <div className="rounded-xl border border-teal-500/30 bg-black/65 p-4 text-xs text-teal-50/85">
            <p className="font-semibold text-teal-200">Demo Credentials (Password: AuraDemo123!)</p>
            <div className="mt-2 space-y-1">
              {DEMO_ACCOUNTS.map((account) => (
                <p key={account.email}>
                  {account.role}: {account.email}
                </p>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <button className="btn-primary w-full" disabled={busy} type="submit">
          {busy ? "Please wait..." : isDemoMode ? "Login to Demo" : mode === "login" ? "Login" : "Create account"}
        </button>

        {!isDemoMode && (
          <button type="button" className="btn-secondary w-full" onClick={() => void onGoogleSignIn()} disabled={busy}>
            Continue with Google
          </button>
        )}

        {!isDemoMode && (
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
          </button>
        )}
      </div>
    </form>
  );
}
