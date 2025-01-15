"use client";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const routeConfig = {
  // Public routes
  "/auth/login": { protected: false },
  "/auth/signup": { protected: false },
  // Protected routes
  "/student/dashboard": { protected: true, roles: ["student", "admin"] }, // Allow admin access too
  "/teacher/dashboard": { protected: true, roles: ["teacher", "admin"] },
  "/admin/dashboard": { protected: true, roles: ["admin"] },
  // Add more routes as needed
};

export default function RouteGuard({ children }) {
  const { user, loading } = useSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!window) return;

    const pathname = window.location.pathname;
    const route = routeConfig[pathname];

    if (!route) return; // Allow unspecified routes

    if (loading) return;

    if (route.protected && (!user?.role || !user?.emailVerified)) {
      console.log("Redirecting to login");
      router.replace("/auth/login");
      return;
    }

    if (route.roles && !route.roles.includes(user?.role)) {
      // Redirect based on role
      const roleRedirectMap = {
        student: "/student/dashboard",
        teacher: "/teacher/dashboard",
        admin: "/admin/dashboard",
      };
      const redirectPath = roleRedirectMap[user?.role] || "/auth/login";
      router.replace(redirectPath);
      return;
    }

    // Handle authenticated users on public routes
    if (!route.protected && user?.role) {
      const roleRedirectMap = {
        student: "/student/dashboard",
        teacher: "/teacher/dashboard",
        admin: "/admin/dashboard",
      };
      router.replace(roleRedirectMap[user.role]);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return children;
}
