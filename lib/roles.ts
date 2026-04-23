import { UserRole } from "@/lib/types";

export function normalizeRole(value: unknown): UserRole | null {
  const role = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (role === "admin" || role === "administrator") {
    return "admin";
  }

  if (role === "instructor" || role === "coach" || role === "trainer") {
    return "instructor";
  }

  if (role === "student" || role === "learner") {
    return "student";
  }

  if (role === "parent") {
    return "parent";
  }

  return null;
}
