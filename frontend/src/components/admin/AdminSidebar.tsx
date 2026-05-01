"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  Home,
  LogOut,
  UserRound,
} from "lucide-react";
import { signOutUser } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  isActive: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/clients",
    icon: Home,
    isActive: (pathname) => pathname === "/admin/clients",
  },
  // {
  //   label: "Clients",
  //   href: "/admin/clients",
  //   icon: UserRound,
  //   isActive: (pathname) => pathname.startsWith("/admin/clients/"),
  // },
  // {
  //   label: "Documents",
  //   href: "/admin/create",
  //   icon: FileText,
  //   isActive: (pathname) => pathname === "/admin/create",
  // },
  // {
  //   label: "Reports",
  //   href: "/admin/clients",
  //   icon: BarChart3,
  //   isActive: () => false,
  // },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    try {
      await signOutUser();
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-[#061f33] bg-[#052b46] text-white lg:sticky lg:top-0 lg:h-dvh lg:w-[260px] lg:border-b-0 lg:border-r">
      <div className="flex min-h-0 flex-1 flex-col lg:h-dvh">
        <div className="flex h-[70px] items-center border-b border-[#0b3d61] px-4">
          <div className="relative h-[50px] w-[176px] shrink-0">
            <Image
              src="/logo.avif"
              alt="God Bless Retirement"
              fill
              priority
              className="object-contain object-left"
              sizes="176px"
            />
          </div>
        </div>

        <nav className="flex-1 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = item.isActive(pathname);
              const Icon = item.icon;

              return (
                <li key={`${item.label}-${item.href}`}>
                  <Link
                    href={item.href}
                    className={`relative mx-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-[#073454] text-white"
                        : "text-[#e6edf3] hover:bg-[#073454] hover:text-white"
                    }`}
                  >
                    {active ? (
                      <span className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[#2f81f7]" />
                    ) : null}
                    <Icon
                      className="h-5 w-5 shrink-0 text-[#e6edf3]"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto border-t border-[#0b3d61] px-4 py-4">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-[#e6edf3] transition hover:bg-[#073454] hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
