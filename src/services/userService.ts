import type { AppUser, Auth0Profile } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function saveUserIfNotExists(
  profile: Auth0Profile
): Promise<AppUser> {
  const ref = doc(db, "users", profile.sub);
  const snap = await getDoc(ref);

  const userData: AppUser = {
    uid: profile.sub,
    name: profile.name ?? null,
    email: profile.email ?? null,
    photoURL: profile.picture ?? null,
  };

  if (!snap.exists()) {
    await setDoc(ref, userData);
    return userData;
  }

  // Merge Firestore data safely
  const existing = snap.data();

  return {
    uid: existing.uid,
    name: existing.name ?? null,
    email: existing.email ?? null,
    photoURL: existing.photoURL ?? null,
  };
}
