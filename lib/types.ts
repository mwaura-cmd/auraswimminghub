export type UserRole = "student" | "parent" | "instructor" | "admin";

export type SwimLevel = "beginner" | "intermediate" | "advanced" | "competitive";

export interface SwimmerProfile {
  level: SwimLevel;
  waterTreadingCapabilitySeconds: number;
  fearOfDeepWater: boolean;
  fitnessGoals: string[];
  preferredStrokes: string[];
  sessionTimeLimitMinutes: number;
  notes?: string;
  updatedAt?: string;
}

export type ProgramType =
  | "Toddlers & Kids"
  | "Teens"
  | "Adults"
  | "Competitive Training"
  | "Water Treading Skills";

export type LearnerGroup = "Toddlers" | "Kids" | "Teens" | "Adults";

export type BillingCycle = "daily" | "weekly" | "monthly";

export type AttendanceStatus = "pending" | "present" | "absent";

export interface PlatformUser {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  childrenIds?: string[];
  swimmerProfile?: SwimmerProfile;
  createdAt?: string;
}

export interface BookingInput {
  program: ProgramType;
  learnerGroup: LearnerGroup;
  billingCycle: BillingCycle;
  amountKes: number;
  date: string;
  time: string;
  fullName: string;
  email: string;
  phone: string;
  learnerName: string;
  notes?: string;
}

export interface Booking extends BookingInput {
  id: string;
  status: "pending" | "paid" | "confirmed";
  userId?: string | null;
  paystackReference?: string;
  paidAt?: string;
  attendanceStatus?: AttendanceStatus;
  attendanceMarkedAt?: string;
  attendanceMarkedByUid?: string;
  createdAt: string;
}

export type GalleryMediaType = "image" | "video";

export interface GalleryItem {
  id: string;
  uploaderUid: string;
  uploaderRole: UserRole;
  caption: string;
  mediaUrl: string;
  mediaPath?: string;
  mediaType: GalleryMediaType;
  pinned: boolean;
  createdAt: string;
}
