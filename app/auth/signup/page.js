"use client";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SignupForm from "./signup-form";

export default function SignupPage() {
  const { user, loading } = useSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if user is already authenticated
    if (!loading && user) {
      if (user.role === "student") {
        router.replace("/student/dashboard");
      } else if (user.role === "teacher") {
        router.replace("/teacher/dashboard");
      } else if (user.role === "admin") {
        router.replace("/admin/dashboard");
      }
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Only render signup form if user is not authenticated
  return !user ? <SignupForm /> : null;
}
