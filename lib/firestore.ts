import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { BookingInput, PlatformUser, UserRole } from "@/lib/types";

export async function ensureUserProfile(role: UserRole, payload?: Partial<PlatformUser>) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase not configured");
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase not configured");
  }

  const currentUser = auth.currentUser;
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase not configured");
  }
  if (!currentUser) {
    return;
  }

  await setDoc(
    doc(db, "users", currentUser.uid),
    {
      uid: currentUser.uid,
      email: currentUser.email,
      role,
      displayName: payload?.displayName ?? currentUser.displayName ?? "",
      childrenIds: payload?.childrenIds ?? [],
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function createBooking(data: BookingInput) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase not configured");
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase not configured");
  }

  const currentUser = auth.currentUser;
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firebase not configured");
  }
  const payload = {
    ...data,
    status: "pending",
    userId: currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
  };

  const result = await addDoc(collection(db, "bookings"), payload);

  if (currentUser) {
    const bookingCountSnapshot = await getCountFromServer(
      query(collection(db, "bookings"), where("userId", "==", currentUser.uid)),
    );

    if (bookingCountSnapshot.data().count >= 2) {
      await addDoc(collection(db, "notifications"), {
        userId: currentUser.uid,
        type: "portal_invite",
        title: "Unlock your learner portal",
        message: "You have completed 2 bookings. Create your learner account now.",
        read: false,
        createdAt: serverTimestamp(),
      });
    }
  }

  return result.id;
}

export async function getUpcomingSessions(userId: string) {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const db = getFirebaseDb();
  if (!db) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      collection(db, "sessions"),
      where("userId", "==", userId),
      orderBy("startTime", "asc"),
      limit(6),
    ),
  );

  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
}
