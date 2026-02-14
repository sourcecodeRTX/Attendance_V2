"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, firestore } from "./config";
import { db } from "@/lib/db";
import type { User } from "@/lib/types/user";
import { FIREBASE_ERROR_MESSAGES } from "@/lib/utils/constants";

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  className: string;
  section: string;
}

export function getFirebaseErrorMessage(code: string): string {
  return FIREBASE_ERROR_MESSAGES[code] || "An error occurred. Please try again.";
}

export async function register(data: RegisterData): Promise<User> {
  try {
    // 1. Create Firebase Auth account
    const credential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    // 2. Create user profile
    const userProfile: User = {
      id: credential.user.uid,
      email: data.email,
      displayName: data.displayName,
      className: data.className,
      section: data.section,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 3. Save to Firestore
    await setDoc(doc(firestore, "users", credential.user.uid), userProfile);

    // 4. Cache locally
    await db.users.put({
      id: credential.user.uid,
      data: userProfile,
      lastSynced: Date.now(),
    });

    return userProfile;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error) {
      const message = getFirebaseErrorMessage((error as { code: string }).code);
      throw new Error(message);
    }
    throw error;
  }
}

export async function login(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    // Fetch profile from Firestore
    const profileDoc = await getDoc(doc(firestore, "users", credential.user.uid));
    
    if (!profileDoc.exists()) {
      throw new Error("User profile not found");
    }

    const profile = profileDoc.data() as User;

    // Cache locally
    await db.users.put({
      id: credential.user.uid,
      data: profile,
      lastSynced: Date.now(),
    });

    return profile;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error) {
      const message = getFirebaseErrorMessage((error as { code: string }).code);
      throw new Error(message);
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error) {
      const message = getFirebaseErrorMessage((error as { code: string }).code);
      throw new Error(message);
    }
    throw error;
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No authenticated user");
  }

  try {
    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error) {
      const message = getFirebaseErrorMessage((error as { code: string }).code);
      throw new Error(message);
    }
    throw error;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<User> {
  const userRef = doc(firestore, "users", userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error("User not found");
  }

  const currentData = userDoc.data() as User;
  const updatedData: User = {
    ...currentData,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(userRef, updatedData, { merge: true });

  // Update local cache
  await db.users.put({
    id: userId,
    data: updatedData,
    lastSynced: Date.now(),
  });

  return updatedData;
}

export async function getCachedUser(userId: string): Promise<User | null> {
  const cached = await db.users.get(userId);
  return cached?.data ?? null;
}

export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth.currentUser;
}
