"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { LoadingScreen } from "@/components/shared/loading-spinner";

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublicPath) {
      // User is not authenticated and trying to access protected route
      router.replace("/login");
    } else if (isAuthenticated && isPublicPath) {
      // User is authenticated but on auth page, redirect to dashboard
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, isPublicPath, router]);

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingScreen message="Checking authentication..." />
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated && !isPublicPath) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingScreen message="Redirecting to login..." />
      </div>
    );
  }

  // Don't render auth pages if authenticated
  if (isAuthenticated && isPublicPath) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingScreen message="Redirecting to dashboard..." />
      </div>
    );
  }

  return <>{children}</>;
}
