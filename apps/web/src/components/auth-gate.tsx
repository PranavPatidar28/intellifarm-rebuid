"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/session";

import { Skeleton } from "./ui/skeleton";

type AuthGateProps = {
  children: ReactNode;
  requiredRole?: "FARMER" | "ADMIN";
};

export function AuthGate({ children, requiredRole }: AuthGateProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useSession();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }

    if (
      !isLoading &&
      isAuthenticated &&
      requiredRole &&
      user?.role !== requiredRole
    ) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, requiredRole, router, user?.role]);

  if (isLoading) {
    return (
      <div className="page-shell">
        <div className="app-frame flex min-h-[70vh] items-center justify-center">
          <div className="surface-card-strong w-full max-w-xl p-6">
            <p className="eyebrow">Preparing workspace</p>
            <h2 className="mt-2 text-2xl font-semibold">Loading your farm data</h2>
            <p className="mt-3 text-sm leading-6 muted">
              Checking the session and restoring the latest field context.
            </p>
            <div className="mt-5 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-24 w-full" />
              <div className="grid gap-3 md:grid-cols-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requiredRole && user?.role !== requiredRole) return null;

  return <>{children}</>;
}
