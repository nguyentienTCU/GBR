"use client";

import { useState } from "react";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import { signOutUser } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Users", href: "/admin/users" },
  { label: "Create User", href: "/admin/users/create" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);

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

  function isActive(href: string) {
    if (href === "/admin/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="sticky top-16 h-[calc(100vh-128px)] w-64 shrink-0 border-r border-gray-200 bg-white">
      <div className="flex h-full flex-col">
        <div className="border-b border-gray-200 px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            GBR Admin
          </h1>
          <p className="mt-1 text-sm text-gray-500">Management Portal</p>
        </div>

        <nav className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Main Menu
          </p>

          <ul className="space-y-2">
            {navItems.map((item) => {
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
