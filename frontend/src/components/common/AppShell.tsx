"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { redirect, usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import AdminSidebar from "@/components/admin/AdminSidebar";
import UserSidebar from "@/components/client/UserSidebar";
import { ChangePasswordModal } from "@/components/common/ChangePasswordModal";
import Footer from "@/components/common/Footer";
import Navbar from "@/components/common/Navbar";
import AppLoadingScreen from "@/components/common/AppLoadingScreen";
import { UserStepProvider, useUserStep } from "@/contexts/UserStepContext";
import {
  getCurrentSession,
  refreshCurrentSession,
  subscribeToAuthStateChange,
} from "@/lib/auth";
import { Notification } from "@/components/ui/Notification";

type AppShellProps = {
  children: ReactNode;
};

const PUBLIC_ROUTES = new Set([
  "/login",
  "/forgot-password",
  "/auth/reset-password",
]);

const ADMIN_ALLOWED_ROUTES = new Set(["/admin/create", "/admin/clients"]);

const USER_ALLOWED_ROUTES = new Set([
  "/dashboard",
  "/agreement",
  "/deposit-fees",
  "/agreement/return",
]);

function isAllowedRoute(
  pathname: string,
  allowedRoutes: Set<string>,
  role: string | null,
) {
  if (allowedRoutes.has(pathname)) {
    return true;
  }

  if (role === "admin" && pathname.startsWith("/admin/clients/")) {
    return true;
  }

  return false;
}

function getDefaultRouteForRole(role: string | null) {
  if (role === "admin") {
    return "/admin/clients";
  }

  if (role === "buyer" || role === "seller") {
    return "/dashboard";
  }

  return "/";
}

function UserStepGuard({ pathname }: { pathname: string }) {
  const { canAccessPath, isLoading, nextUnlockedPath } = useUserStep();

  if (!isLoading && !canAccessPath(pathname)) {
    redirect(nextUnlockedPath);
  }

  return null;
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-dvh">
        {isLoading ? (
          <AppLoadingScreen
            title="Loading your progress"
            description="We’re checking your current onboarding step so this page opens in the correct state."
            variant="user"
            fullScreen
          />
        ) : (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
        )}
        <Footer />
      </div>
    </>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<string | null>(null);
  const [showPasswordNotice, setShowPasswordNotice] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [hasCheckedPassword, setHasCheckedPassword] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  const syncAuth = useCallback((currentSession: Session | null) => {
    setSession(currentSession);

    if (!currentSession) {
      setRole(null);
      setHasCheckedPassword(false);
      setShowPasswordNotice(false);
      setShowPasswordModal(false);
      return;
    }

    const sessionRole =
      typeof currentSession.user.app_metadata?.role === "string"
        ? currentSession.user.app_metadata.role
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
        setHasCheckedPassword(false);
        setShowPasswordNotice(false);
        setShowPasswordModal(false);
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

  useEffect(() => {
    if (!session || hasCheckedPassword || isPublicRoute) return;

    const passwordChanged =
      session.user.app_metadata?.password_changed === true;

    if (!passwordChanged) {
      setShowPasswordNotice(true);
    }

    setHasCheckedPassword(true);
  }, [session, hasCheckedPassword, isPublicRoute]);

  function handlePasswordNoticeClose() {
    setShowPasswordNotice(false);
    setShowPasswordModal(true);
  }

  function handlePasswordModalClose() {
    setShowPasswordModal(false);
  }

  if (session === undefined) {
    return null;
  }

  if (!session && !isPublicRoute) {
    redirect("/login");
  }

  if (session && isPublicRoute) {
    redirect(getDefaultRouteForRole(role));
  }

  const isAdmin = role === "admin";
  const isUser = role === "buyer" || role === "seller";

  if (
    !isPublicRoute &&
    isAdmin &&
    !isAllowedRoute(pathname, ADMIN_ALLOWED_ROUTES, role)
  ) {
    redirect("/admin/clients");
  }

  if (
    !isPublicRoute &&
    isUser &&
    !isAllowedRoute(pathname, USER_ALLOWED_ROUTES, role)
  ) {
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
    <>
      <div className="flex min-h-dvh flex-col bg-[#F8F9FB] text-[#111827]">
        <div className="flex min-h-0 flex-1 flex-col items-stretch lg:min-h-dvh lg:flex-row">
          {showAdminSidebar && <AdminSidebar />}

          {showUserSidebar && (
            <UserStepProvider>
              <UserStepGuard pathname={pathname} />
              <UserAppFrame pathname={pathname}>{children}</UserAppFrame>
            </UserStepProvider>
          )}

          {!showUserSidebar && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-dvh">
              <main className="flex min-h-0 min-w-0 flex-1 flex-col">
                {children}
              </main>
              <Footer />
            </div>
          )}
        </div>
      </div>

      <Notification
        open={showPasswordNotice}
        onClose={handlePasswordNoticeClose}
        variant="error"
        title="Password change required"
        message="For account security, please change your password before continuing."
      />

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={handlePasswordModalClose}
      />
    </>
  );
}
