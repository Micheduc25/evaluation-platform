"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/client";
import { setUser, setLoading } from "@/store/slices/authSlice";
import { getUserDocument, serializeUser } from "@/firebase/utils";

export function AuthProvider({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setLoading(true));

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const firestoreUser = await getUserDocument(user.uid);
          // Only dispatch if we successfully retrieved the user document
          if (firestoreUser) {
            dispatch(setUser(serializeUser(firestoreUser)));
          } else {
            // Handle edge case where auth user exists but firestore doc doesn't
            dispatch(setUser(null));
          }
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
