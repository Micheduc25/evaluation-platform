"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase/client";
import Link from "next/link";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error) {
      setError(
        error.code === "auth/user-not-found"
          ? "No account found with this email address."
          : "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-200">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md text-gray-500">
          <h2 className="text-3xl font-bold text-center text-green-600">
            Check Your Email
          </h2>
          <p className="text-center">
            We've sent password reset instructions to {email}. Please check your
            email inbox.
          </p>
          <div className="text-center mt-4">
            <Link
              href="/auth/login"
              className="text-blue-600 hover:text-blue-800"
            >
              Return to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md text-gray-500">
        <h2 className="text-3xl font-bold text-center">Reset Password</h2>
        <p className="text-center">
          Enter your email address and we'll send you instructions to reset your
          password.
        </p>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              type="email"
              required
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Sending..." : "Reset Password"}
          </button>
        </form>
        <p className="text-center mt-4">
          <Link
            href="/auth/login"
            className="text-blue-600 hover:text-blue-800"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
