"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { redirect, usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import AdminSidebar from "@/components/admin/AdminSidebar";
import UserSidebar from "@/components/client/UserSidebar";
import Footer from "@/components/common/Footer";
import Navbar from "@/components/common/Navbar";
import { UserStepProvider, useUserStep } from "@/contexts/UserStepContext";
import {
  getCurrentSession,
  refreshCurrentSession,
  subscribeToAuthStateChange,
} from "@/lib/auth";

type AppShellProps = {
  children: ReactNode;
};

const PUBLIC_ROUTES = new Set([
  "/login",
  "/forgot-password",
  "/auth/reset-password",
]);

const ADMIN_ALLOWED_ROUTES = new Set([
  "/admin/create",
  "/admin/clients",
]);

const USER_ALLOWED_ROUTES = new Set([
  "/dashboard",
  "/agreement",
  "/deposit-fees",
]);

function isAllowedRoute(
  pathname: string,
  allowedRoutes: Set<string>,
  role: string | null
) {
  if (allowedRoutes.has(pathname)) {
    return true;
  }

  if (role === "admin" && pathname.startsWith("/admin/clients/")) {
    return true;
  }

  return false;
}

function UserStepGuard({ pathname }: { pathname: string }) {
  const { canAccessPath, isLoading, nextUnlockedPath } = useUserStep();

  if (!isLoading && !canAccessPath(pathname)) {
    redirect(nextUnlockedPath);
  }

  return null;
}

function UserLoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-[radial-gradient(circle_at_top_right,_rgba(201,166,91,0.08),_transparent_22%),linear-gradient(180deg,_#F8FAFD_0%,_#F4F7FB_100%)] px-6">
      <div className="w-full max-w-md rounded-[28px] border border-[#E4EAF3] bg-white px-8 py-10 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#E9EEF6] border-t-[#C9A65B]" />
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#14213D]">
          Loading your progress
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#667892]">
          We&apos;re checking your current onboarding step so this page opens in the
          correct state.
        </p>
      </div>
    </div>
  );
}

function UserAppFrame({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  const { canAccessPath, isLoading, nextUnlockedPath } = useUserStep();

  if (!isLoading && !canAccessPath(pathname)) {
    redirect(nextUnlockedPath);
  }

  return (
    <>
      <UserSidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {isLoading ? <UserLoadingScreen /> : children}
      </main>
    </>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<string | null>(null);

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  const syncAuth = useCallback((currentSession: Session | null) => {
    setSession(currentSession);

    if (!currentSession) {
      setRole(null);
      return;
    }

    const sessionRole =
      typeof currentSession.user.user_metadata?.role === "string"
        ? currentSession.user.user_metadata.role
        : null;

    setRole(sessionRole);
  }, []);

  useEffect(() => {
    let mounted = true;

    function safeSync(currentSession: Session | null) {
      if (!mounted) return;
      syncAuth(currentSession);
    }

    async function initializeSession() {
      try {
        const initialSession = await getCurrentSession();
        safeSync(initialSession);
      } catch (error) {
        console.error("Failed to initialize session:", error);

        if (!mounted) return;
        setSession(null);
        setRole(null);
      }
    }

    async function refreshAndSyncIfNeeded() {
      try {
        const currentSession = await getCurrentSession();

        if (!mounted) return;

        if (!currentSession) {
          safeSync(null);
          return;
        }

        const refreshedSession = await refreshCurrentSession();
        safeSync(refreshedSession);
      } catch (error) {
        console.error("Failed to refresh session:", error);
      }
    }

    void initializeSession();

    const unsubscribe = subscribeToAuthStateChange((newSession) => {
      safeSync(newSession);
    });

    function handleFocus() {
      if (isPublicRoute) return;
      void refreshAndSyncIfNeeded();
    }

    function handleVisibilityChange() {
      if (isPublicRoute) return;
      if (document.visibilityState === "visible") {
        void refreshAndSyncIfNeeded();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPublicRoute, syncAuth]);

  if (session === undefined) {
    return null;
  }

  if (!session && !isPublicRoute) {
    redirect("/login");
  }

  if (session && pathname === "/login") {
    if (role === "admin") {
      redirect("/admin/clients");
    }

    if (role === "buyer" || role === "seller") {
      redirect("/dashboard");
    }

    redirect("/");
  }

  const isAdmin = role === "admin";
  const isUser = role === "buyer" || role === "seller";

  if (!isPublicRoute && isAdmin && !isAllowedRoute(pathname, ADMIN_ALLOWED_ROUTES, role)) {
    redirect("/admin/clients");
  }

  if (!isPublicRoute && isUser && !isAllowedRoute(pathname, USER_ALLOWED_ROUTES, role)) {
    redirect("/dashboard");
  }

  const showAdminSidebar = isAdmin;
  const showUserSidebar = isUser;

  if (isPublicRoute) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#f3f4f6] text-[#111827]">
        <Navbar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8F9FB] text-[#111827]">
      <div className="flex min-h-dvh flex-1 flex-col items-stretch lg:flex-row">
        {showAdminSidebar && <AdminSidebar />}
        {showUserSidebar && (
          <UserStepProvider>
            <UserStepGuard pathname={pathname} />
            <UserAppFrame pathname={pathname}>{children}</UserAppFrame>
          </UserStepProvider>
        )}

        {!showUserSidebar && (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
