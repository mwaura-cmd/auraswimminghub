"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { auth, rtdb, isFirebaseConfigured } from "@/lib/firebase";
import { DEMO_AUTH_EVENT, getDemoSession } from "@/lib/demo-auth";
import { normalizeRole } from "@/lib/roles";
import { UserRole } from "@/lib/types";

interface AuthContextValue {
  firebaseUser: User | null;
  role: UserRole | null;
  loading: boolean;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  role: null,
  loading: true,
  isDemoMode: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemoMode = !isFirebaseConfigured || !auth || !rtdb;

  useEffect(() => {
    if (isDemoMode) {
      const syncDemoSession = () => {
        const session = getDemoSession();
        if (session) {
          setFirebaseUser({ uid: session.uid, email: session.email } as User);
          setRole(session.role);
        } else {
          setFirebaseUser(null);
          setRole(null);
        }
        setLoading(false);
      };

      syncDemoSession();
      window.addEventListener(DEMO_AUTH_EVENT, syncDemoSession);
      window.addEventListener("storage", syncDemoSession);

      return () => {
        window.removeEventListener(DEMO_AUTH_EVENT, syncDemoSession);
        window.removeEventListener("storage", syncDemoSession);
      };
    }

    const firebaseAuth = auth!;
    const database = rtdb!;

    const loadingGuard = window.setTimeout(() => {
      const current = firebaseAuth.currentUser;
      if (current) {
        setFirebaseUser(current);
        setRole((prev) => prev ?? null);
      }
      setLoading(false);
    }, 8000);

    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      window.clearTimeout(loadingGuard);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setFirebaseUser(user);
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Listen to user profile in realtime database
      const userRef = ref(database, `users/${user.uid}`);
      unsubscribeProfile = onValue(
        userRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setRole(normalizeRole(data.role));
          } else {
            setRole(null);
          }
          setLoading(false);
        },
        () => {
          setRole(null);
          setLoading(false);
        },
      );
    });

    return () => {
      window.clearTimeout(loadingGuard);
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsubscribe();
    };
  }, [isDemoMode]);

  const value = useMemo(
    () => ({ firebaseUser, role, loading, isDemoMode }),
    [firebaseUser, role, loading, isDemoMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
