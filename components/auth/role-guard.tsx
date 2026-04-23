"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { UserRole } from "@/lib/types";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { firebaseUser, role, loading } = useAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoadingTimedOut(false);

    if (!loading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLoadingTimedOut(true);
    }, 9000);

    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  const isResolving = loading && !loadingTimedOut;

  useEffect(() => {
    if (isResolving) {
      return;
    }

    if (!firebaseUser) {
      router.replace("/login");
      return;
    }

    if (!role || !allowedRoles.includes(role)) {
      router.replace("/");
    }
  }, [allowedRoles, firebaseUser, isResolving, role, router]);

  if (isResolving) {
    return (
      <div className="section-shell py-20">
        <div className="glass-card rounded-2xl p-8 text-center">Loading secure dashboard...</div>
      </div>
    );
  }

  if (!firebaseUser || !role || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
