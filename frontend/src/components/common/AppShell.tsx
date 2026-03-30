"use client";

import { ReactNode, useEffect, useState } from "react";
import { redirect, usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import AdminSidebar from "@/components/common/AdminSidebar";
import UserSidebar from "@/components/common/UserSidebar";
import {
  getCurrentSession,
  subscribeToAuthStateChange,
} from "@/lib/auth";

type AppShellProps = {
  children: ReactNode;
};

const LOGIN_PATH = "/login";

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function syncAuth(currentSession: Session | null) {
      if (!mounted) return;

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
    }

    async function initializeSession() {
      try {
        const initialSession = await getCurrentSession();
        await syncAuth(initialSession);
      } catch (error) {
        console.error("Failed to initialize session:", error);

        if (!mounted) return;

        setSession(null);
        setRole(null);
      }
    }

    void initializeSession();

    const unsubscribe = subscribeToAuthStateChange(async (newSession) => {
      if (!mounted) return;
      await syncAuth(newSession);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return null;
  }

  if (!session && pathname !== LOGIN_PATH) {
    redirect(LOGIN_PATH);
  }

  if (session && pathname === LOGIN_PATH) {
    redirect("/");
  }

  const showAdminSidebar = role === "admin";
  const showUserSidebar =
    (role === "buyer" || role === "seller");

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FB] text-[#111827]">
      <Navbar />

      <div className="flex flex-1">
        {showAdminSidebar && <AdminSidebar />}
        {showUserSidebar && <UserSidebar currentStep={1} />}

        <main
          className={`flex-1 ${
            showAdminSidebar ? "ml-64" : showUserSidebar ? "ml-72" : ""
          }`}
        >
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
}
