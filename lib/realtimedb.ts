import { equalTo, get, onValue, orderByChild, push, query, ref, set, update } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth, rtdb, isFirebaseConfigured } from "@/lib/firebase";
import { AttendanceStatus, Booking, BookingInput, GalleryItem, GalleryMediaType, PlatformUser, UserRole } from "@/lib/types";

export async function ensureUserProfile(role: UserRole, payload?: Partial<PlatformUser>) {
  if (!isFirebaseConfigured || !auth || !rtdb) {
    throw new Error("Firebase not configured");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    return;
  }

  const userRef = ref(rtdb, `users/${currentUser.uid}`);
  await set(userRef, {
    uid: currentUser.uid,
    email: currentUser.email,
    role,
    displayName: payload?.displayName ?? currentUser.displayName ?? "",
    childrenIds: payload?.childrenIds ?? [],
    createdAt: new Date().toISOString(),
  });
}

export async function getUserProfile(uid: string): Promise<PlatformUser | null> {
  if (!isFirebaseConfigured || !rtdb) {
    return null;
  }

  const userRef = ref(rtdb, `users/${uid}`);
  const snapshot = await get(userRef);
  if (!snapshot.exists()) {
    console.error(`[RTDB] User profile not found at users/${uid}. Database path exists: true`);
    return null;
  }
  const data = snapshot.val();
  console.log(`[RTDB] User profile loaded for ${uid}:`, data);
  return data;
}

export async function findUserProfileByEmail(email: string): Promise<PlatformUser | null> {
  if (!isFirebaseConfigured || !rtdb || !email) {
    return null;
  }

  const usersRef = ref(rtdb, "users");
  const usersQuery = query(usersRef, orderByChild("email"), equalTo(email));
  const snapshot = await get(usersQuery);

  if (!snapshot.exists()) {
    return null;
  }

  const profiles = Object.values(snapshot.val()) as PlatformUser[];
  return profiles[0] ?? null;
}

export async function createBooking(data: BookingInput) {
  if (!isFirebaseConfigured || !auth || !rtdb) {
    throw new Error("Firebase not configured");
  }

  const currentUser = auth.currentUser;
  const bookingRef = ref(rtdb, "bookings");

  const bookingData = {
    ...data,
    status: "pending",
    attendanceStatus: "pending",
    userId: currentUser?.uid ?? null,
    createdAt: new Date().toISOString(),
  };

  const newBookingRef = await push(bookingRef, bookingData);
  return newBookingRef.key;
}

export async function getBookingCount(userId: string): Promise<number> {
  if (!isFirebaseConfigured || !rtdb) {
    return 0;
  }

  try {
    const bookingsRef = ref(rtdb, "bookings");
    const snapshot = await get(bookingsRef);
    if (!snapshot.exists()) return 0;

    const bookings = snapshot.val() as Record<string, { userId?: string | null }>;
    return Object.values(bookings).filter((booking) => booking.userId === userId).length;
  } catch {
    return 0;
  }
}

export function subscribeBookings(onBookings: (bookings: Booking[]) => void, onError?: (error: Error) => void) {
  if (!isFirebaseConfigured || !rtdb) {
    onBookings([]);
    return () => undefined;
  }

  const bookingsRef = ref(rtdb, "bookings");
  let unsubscribeValue: (() => void) | null = null;
  let disposed = false;

  const attachListener = () => {
    if (unsubscribeValue) {
      unsubscribeValue();
      unsubscribeValue = null;
    }

    unsubscribeValue = onValue(
      bookingsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onBookings([]);
          return;
        }

        const data = snapshot.val() as Record<string, Omit<Booking, "id">>;
        const entries = Object.entries(data)
          .map(([id, item]) => ({ id, ...item }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        onBookings(entries);
      },
      (error) => {
        onError?.(error instanceof Error ? error : new Error("Failed to load bookings"));
      },
    );
  };

  if (!auth) {
    attachListener();
    return () => {
      disposed = true;
      if (unsubscribeValue) {
        unsubscribeValue();
      }
    };
  }

  const firebaseAuth = auth;

  const attachWhenReady = async () => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      onBookings([]);
      if (unsubscribeValue) {
        unsubscribeValue();
        unsubscribeValue = null;
      }
      return;
    }

    try {
      await currentUser.getIdToken();
    } catch {
      // Continue and let onValue surface auth errors if token refresh fails.
    }

    if (!disposed) {
      attachListener();
    }
  };

  void attachWhenReady();
  const unsubscribeAuth = onAuthStateChanged(firebaseAuth, () => {
    void attachWhenReady();
  });

  return () => {
    disposed = true;
    unsubscribeAuth();
    if (unsubscribeValue) {
      unsubscribeValue();
    }
  };
}

export async function markBookingAttendance(bookingId: string, attendanceStatus: AttendanceStatus) {
  if (!isFirebaseConfigured || !auth || !rtdb) {
    throw new Error("Firebase not configured");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to mark attendance.");
  }

  const bookingRef = ref(rtdb, `bookings/${bookingId}`);
  await update(bookingRef, {
    attendanceStatus,
    attendanceMarkedAt: new Date().toISOString(),
    attendanceMarkedByUid: currentUser.uid,
  });
}

interface CreateGalleryItemInput {
  caption: string;
  mediaUrl: string;
  mediaPath: string;
  mediaType: GalleryMediaType;
  uploaderUid: string;
  uploaderRole: UserRole;
  pinned?: boolean;
}

export async function createGalleryItem(input: CreateGalleryItemInput): Promise<string> {
  if (!isFirebaseConfigured || !rtdb) {
    throw new Error("Firebase not configured");
  }

  const galleryRef = ref(rtdb, "gallery");
  const newItemRef = await push(galleryRef, {
    caption: input.caption.trim(),
    mediaUrl: input.mediaUrl,
    mediaPath: input.mediaPath,
    mediaType: input.mediaType,
    uploaderUid: input.uploaderUid,
    uploaderRole: input.uploaderRole,
    pinned: Boolean(input.pinned),
    createdAt: new Date().toISOString(),
  });

  return newItemRef.key ?? "";
}

export function subscribeGalleryItems(onItems: (items: GalleryItem[]) => void, onError?: (error: Error) => void) {
  if (!isFirebaseConfigured || !rtdb) {
    onItems([]);
    return () => undefined;
  }

  const galleryRef = ref(rtdb, "gallery");
  return onValue(
    galleryRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onItems([]);
        return;
      }

      const data = snapshot.val() as Record<string, Omit<GalleryItem, "id">>;
      const entries = Object.entries(data).map(([id, item]) => ({ id, ...item }));
      const sorted = entries.sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      onItems(sorted);
    },
    (error) => {
      onError?.(error instanceof Error ? error : new Error("Failed to load gallery"));
    },
  );
}

export async function updateGalleryPinned(itemId: string, pinned: boolean) {
  if (!isFirebaseConfigured || !rtdb) {
    throw new Error("Firebase not configured");
  }

  const itemRef = ref(rtdb, `gallery/${itemId}`);
  await update(itemRef, { pinned });
}

export async function updateGalleryCaption(itemId: string, caption: string) {
  if (!isFirebaseConfigured || !rtdb) {
    throw new Error("Firebase not configured");
  }

  const itemRef = ref(rtdb, `gallery/${itemId}`);
  await update(itemRef, { caption: caption.trim() });
}

export async function deleteGalleryItem(itemId: string) {
  if (!isFirebaseConfigured || !rtdb) {
    throw new Error("Firebase not configured");
  }

  const itemRef = ref(rtdb, `gallery/${itemId}`);
  await set(itemRef, null);
}
