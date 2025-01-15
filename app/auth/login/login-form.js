"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "@/firebase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { getUserDocument } from "@/firebase/utils";
import { setUser } from "@/store/slices/authSlice";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
        setNeedsVerification(true);
        return;
      }

      // Fetch user data from Firestore
      const userData = await getUserDocument(userCredential.user.uid);
      dispatch(setUser({ ...userData, emailVerified: true }));
      router.push(`/${userData.role}/dashboard`);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleResendVerification = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setError("Verification email resent!");
      }
    } catch (error) {
      setError(error.message);
    }
  };

  if (needsVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-200">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md text-gray-500">
          <h2 className="text-3xl font-bold text-center">
            Email Verification Required
          </h2>
          <p className="text-center">
            Please check your email ({email}) and verify your account before
            signing in.
          </p>
          <button
            onClick={handleResendVerification}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Resend verification email
          </button>
          <p className="text-center mt-4">
            Already verified? Try{" "}
            <button
              onClick={() => setNeedsVerification(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              signing in again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md text-gray-500">
        <h2 className="text-3xl font-bold text-center">
          Sign in to your account
        </h2>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              type="email"
              required
              className="w-full px-3 py-2 border rounded-md"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              name="current-password"
              id="current-password"
              autoComplete="current-password"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>
        <p className="text-center mt-4">
          Don't have an account?{" "}
          <Link
            href="/auth/signup"
            className="text-blue-600 hover:text-blue-800"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
