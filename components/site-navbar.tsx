"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { NAV_LINKS } from "@/lib/constants";
import { clearDemoSession } from "@/lib/demo-auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

export function SiteNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseUser, isDemoMode } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);

    try {
      if (isDemoMode) {
        clearDemoSession();
      } else if (auth) {
        await signOut(auth);
      }

      router.push("/login");
    } finally {
      setBusy(false);
    }
  };

  const visibleLinks = firebaseUser
    ? NAV_LINKS.filter((item) => item.href !== "/login")
    : NAV_LINKS;

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-teal-500/20 bg-black/70 backdrop-blur-xl">
      <nav className="section-shell flex h-20 items-center justify-between gap-4">
        <Link href="/" className="font-heading text-sm font-bold tracking-[0.3em] text-teal-100 md:text-base">
          AURA SWIMMING HUB
        </Link>
        {firebaseUser && (
          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-full border border-teal-500/30 bg-teal-500/10 p-2 text-teal-100 transition hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60 md:hidden"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
        <div className="hidden items-center gap-2 md:flex">
          {visibleLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition",
                pathname === item.href
                  ? "bg-teal-500/25 text-teal-100 teal-ring"
                  : "text-teal-50/75 hover:bg-teal-500/15 hover:text-teal-50",
              )}
            >
              {item.label}
            </Link>
          ))}
          {firebaseUser && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm text-teal-100 transition hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
              <span>{busy ? "Logging out..." : "Logout"}</span>
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
