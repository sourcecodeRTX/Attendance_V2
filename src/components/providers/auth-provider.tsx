"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase/config";
import { useAuthStore } from "@/lib/stores/auth-store";
import { db } from "@/lib/db";
import { pullFromCloud, processSyncQueue } from "@/lib/db/sync";
import type { User } from "@/lib/types/user";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Try local cache first for instant UI
          const cachedUser = await db.users.get(firebaseUser.uid);
          
          if (cachedUser) {
            // Set user immediately from cache - UI unblocks here
            setUser(cachedUser.data);
          }

          // Fetch fresh profile from Firestore (non-blocking for UI)
          const freshFetch = async () => {
            try {
              const userDoc = await getDoc(doc(firestore, "users", firebaseUser.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                setUser(userData);
                await db.users.put({
                  id: firebaseUser.uid,
                  data: userData,
                  lastSynced: Date.now(),
                });
              } else if (!cachedUser) {
                setUser(null);
              }
            } catch (fetchErr) {
              console.warn("Failed to fetch fresh profile, using cache:", fetchErr);
              if (!cachedUser) {
                setUser(null);
              }
            }
          };

          // If no cache, we must wait for Firestore to get user data
          if (!cachedUser) {
            await freshFetch();
          } else {
            // If cached, fetch fresh data in background (don't block UI)
            freshFetch();
          }

          // Background sync - never block the UI for this
          const backgroundSync = async () => {
            try {
              const [studentCount, subjectCount] = await Promise.all([
                db.students.count(),
                db.subjects.count(),
              ]);

              if (studentCount === 0 && subjectCount === 0) {
                await pullFromCloud();
              } else {
                await processSyncQueue();
              }
            } catch (err) {
              console.warn("Background sync failed:", err);
            }
          };
          // Fire and forget - don't await
          backgroundSync();
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
