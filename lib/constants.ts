import { ProgramType } from "@/lib/types";

export const PROGRAMS: ProgramType[] = [
  "Toddlers & Kids",
  "Teens",
  "Adults",
  "Competitive Training",
  "Water Treading Skills",
];

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/programs", label: "Programs" },
  { href: "/about", label: "About" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#testimonials", label: "Testimonials" },
  { href: "/book", label: "Book" },
  { href: "/login", label: "Login" },
];

export const ROLE_ROUTES = {
  student: "/portal",
  parent: "/portal",
  instructor: "/instructor",
  admin: "/admin",
} as const;
