"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/client";
import { setUser, setLoading } from "@/store/slices/authSlice";
import { getUserDocument } from "@/firebase/utils";

export function AuthProvider({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setLoading(true));

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const firestoreUser = await getUserDocument(user.uid);
          dispatch(
            setUser({
              uid: user.uid,
              email: firestoreUser.email,
              displayName: firestoreUser.displayName,
              role: firestoreUser.role,
              createdAt:
                firestoreUser.createdAt?.toDate().toISOString() || null,
              lastLogin:
                firestoreUser.lastLogin?.toDate().toISOString() || null,
            })
          );
        } else {
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        dispatch(setUser(null));
      } finally {
        dispatch(setLoading(false));
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return children;
}
