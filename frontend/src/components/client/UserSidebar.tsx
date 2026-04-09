"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import {
  FileText,
  Home,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { signOutUser, getCurrentSession, subscribeToAuthStateChange } from "@/lib/auth";
import { ChangePasswordModal } from "@/components/common/ChangePasswordModal";
import { ProfileModal } from "@/components/common/ProfileModal";
import { useUserStep } from "@/contexts/UserStepContext";
import { isRouteCompletedForStep, isRouteUnlockedForStep } from "@/lib/user-step";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Agreement", href: "/agreement", icon: FileText },
  { label: "Deposit Fee", href: "/deposit-fees", icon: FileText },
];

function displayNameFromUser(user: User | null): string {
  if (!user) return "Unknown";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const first =
    typeof meta?.first_name === "string" ? meta.first_name.trim() : "";
  const last =
    typeof meta?.last_name === "string" ? meta.last_name.trim() : "";
  const combined = [first, last].filter(Boolean).join(" ");
  if (combined) return combined;
  if (user.email) return user.email.split("@")[0] ?? "Unknown";
  return "Unknown";
}

function initialFromUser(user: User | null): string {
  const name = displayNameFromUser(user);
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : "U";
}

export default function UserSidebar() {
  const pathname = usePathname();
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { currentStep, isLoading: isStepLoading } = useUserStep();

  useEffect(() => {
    let mounted = true;

    async function load() {
      const session = await getCurrentSession();
      if (!mounted) return;
      setAuthUser(session?.user ?? null);
    }

    void load();

    const unsub = subscribeToAuthStateChange((next: Session | null) => {
      if (!mounted) return;
      setAuthUser(next?.user ?? null);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const el = accountMenuRef.current;
      if (el && !el.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [accountMenuOpen]);

  if (shouldRedirectToLogin) {
    redirect("/login");
  }

  async function handleLogout() {
    try {
      await signOutUser();
      setShouldRedirectToLogin(true);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  }

  function isNavActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const displayName = displayNameFromUser(authUser);

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-[#151d2e] bg-[#0a1120] text-white lg:w-64 lg:border-b-0 lg:border-r lg:border-[#151d2e]">
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:min-h-dvh">
        <div className="border-b border-[#151d2e] px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0d1528] ring-1 ring-[#C9A65B]/35">
              <ShieldCheck
                className="h-6 w-6 text-[#C9A65B]"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-lg font-bold tracking-tight text-white">
                GodBless
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9A65B]">
                RETIREMENT
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 lg:py-6">
          <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea0bd]">
            Navigation
          </p>

          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = isNavActive(item.href);
              const Icon = item.icon;
              const isUnlocked =
                item.href === "/dashboard"
                  ? true
                  : isRouteUnlockedForStep(item.href, currentStep);
              const isCompleted =
                item.href === "/dashboard"
                  ? false
                  : isRouteCompletedForStep(item.href, currentStep);
              const isDisabled = !isStepLoading && !isUnlocked;
              const isTemporarilyDisabled =
                item.href !== "/dashboard" && (isStepLoading || isDisabled);
              const itemClassName = `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                active
                  ? "bg-[#1a2332] text-[#C9A65B]"
                  : isTemporarilyDisabled
                    ? "cursor-not-allowed text-[#6d7f99]"
                    : "text-white hover:bg-white/6"
              }`;

              return (
                <li key={item.href}>
                  {isTemporarilyDisabled ? (
                    <div
                      aria-disabled="true"
                      className={itemClassName}
                    >
                      <Icon
                        className="h-5 w-5 shrink-0 text-[#6d7f99]"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#93a3bb]">
                        {isStepLoading ? "Loading" : "Locked"}
                      </span>
                    </div>
                  ) : (
                    <Link href={item.href} className={itemClassName}>
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          active
                            ? "text-[#C9A65B]"
                            : isCompleted
                              ? "text-[#C9A65B]"
                              : "text-white"
                        }`}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className="flex-1">{item.label}</span>
                      {isCompleted ? (
                        <span className="rounded-full bg-[#C9A65B]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E6C57F]">
                          Done
                        </span>
                      ) : null}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto border-t border-[#151d2e] px-4 py-5">
          <div ref={accountMenuRef} className="relative mb-5">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-white/6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A65B]/50"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d1528] text-sm font-semibold text-[#C9A65B] ring-1 ring-[#C9A65B]/30"
                aria-hidden
              >
                {initialFromUser(authUser)}
              </div>
              <div className="min-w-0 flex-1 cursor-pointer">
                <p className="truncate font-semibold text-white">{displayName}</p>
                <p className="text-xs text-[#8ea0bd]">User</p>
              </div>
            </button>

            {accountMenuOpen ? (
              <div
                role="menu"
                className="absolute bottom-full left-0 right-0 z-40 mb-2 overflow-hidden rounded-xl border border-[#2a3548] bg-[#1a2332] py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/10 cursor-pointer"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setProfileOpen(true);
                  }}
                >
                  <UserRound className="h-4 w-4 shrink-0 text-[#C9A65B]" strokeWidth={2} />
                  Profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/10 cursor-pointer"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setChangePasswordOpen(true);
                  }}
                >
                  <KeyRound
                    className="h-4 w-4 shrink-0 text-[#C9A65B]"
                    strokeWidth={2}
                  />
                  Change password
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#8ea0bd] transition hover:bg-white/6 hover:text-white"
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
