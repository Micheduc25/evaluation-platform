"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/client";
import { setUser, setLoading } from "@/store/slices/authSlice";
import { getUserDocument, serializeUser, createUserDocument } from "@/firebase/utils";

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
            console.warn("User document missing. Attempting auto-repair...");
            // Auto-repair: Create missing user document
            // Use existing display name or generate a temporary one
            const generatedName = user.displayName || `Student ${user.uid.slice(0, 5).toUpperCase()}`;
            
            const newUser = await createUserDocument(user, { 
              displayName: generatedName 
            });

            if (newUser) {
              dispatch(setUser(serializeUser(newUser)));
            } else {
              dispatch(setUser(null));
            }
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
