"use client";

import { useSelector } from "react-redux";

export default function AuthInitializer({ children }) {
  const loading = useSelector((state) => state.auth.loading);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
      </div>
    );
  }

  return children;
}
