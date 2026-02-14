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
            setUser(cachedUser.data);
          }

          // Always try to fetch fresh profile from Firestore (in background if cached)
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

          // Auto-pull cloud data if local DB is empty
          const [studentCount, subjectCount] = await Promise.all([
            db.students.count(),
            db.subjects.count(),
          ]);

          if (studentCount === 0 && subjectCount === 0) {
            try {
              await pullFromCloud();
            } catch (err) {
              console.warn("Failed to pull cloud data:", err);
            }
          } else {
            // Process any pending sync queue items
            try {
              await processSyncQueue();
            } catch (err) {
              console.warn("Failed to process sync queue:", err);
            }
          }
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
