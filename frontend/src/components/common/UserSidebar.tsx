"use client";

import { useState } from "react";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import { signOutUser } from "@/lib/auth";

type StepItem = {
  label: string;
  href: string;
  step: number;
};

const stepItems: StepItem[] = [
  { label: "Contract", href: "/user/contract", step: 1 },
  { label: "Deposit Payment", href: "/user/deposit", step: 2 },
];

type UserSidebarProps = {
  currentStep: number;
};

export default function UserSidebar({ currentStep }: UserSidebarProps) {
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

  function getStepStatus(step: number) {
    if (step < currentStep) return "completed";
    if (step === currentStep) return "active";
    return "upcoming";
  }

  function isClickable(step: number) {
    return step <= currentStep;
  }

  function getCircleClass(step: number) {
    const status = getStepStatus(step);

    if (status === "completed") {
      return "border-green-600 bg-green-600 text-white";
    }

    if (status === "active") {
      return "border-gray-900 bg-gray-900 text-white";
    }

    return "border-gray-300 bg-white text-gray-400";
  }

  function getTextClass(step: number) {
    const status = getStepStatus(step);

    if (status === "completed") {
      return "text-gray-700";
    }

    if (status === "active") {
      return "font-semibold text-gray-900";
    }

    return "text-gray-400";
  }

  return (
    <aside className="sticky top-16 h-[calc(100vh-128px)] w-72 shrink-0 border-r border-gray-200 bg-white">
      <div className="flex h-full flex-col">
        <div className="border-b border-gray-200 px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            GBR
          </h1>
          <p className="mt-1 text-sm text-gray-500">User Portal</p>
        </div>

        <div className="border-b border-gray-200 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Onboarding Progress
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Step {Math.min(currentStep, stepItems.length)} of {stepItems.length}
          </p>
        </div>

        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-3">
            {stepItems.map((item, index) => {
              const active = pathname === item.href;
              const clickable = isClickable(item.step);

              const content = (
                <div
                  className={`flex items-start gap-3 rounded-xl px-3 py-3 transition ${
                    active ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${getCircleClass(
                      item.step,
                    )}`}
                  >
                    {item.step < currentStep ? "✓" : item.step}
                  </div>

                  <div className="flex-1">
                    <p className={`text-sm ${getTextClass(item.step)}`}>
                      {item.label}
                    </p>

                    {index !== stepItems.length - 1 && (
                      <div className="ml-4 mt-3 h-6 w-px bg-gray-200" />
                    )}
                  </div>
                </div>
              );

              if (clickable) {
                return (
                  <li key={item.href}>
                    <Link href={item.href}>{content}</Link>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <div className="cursor-not-allowed opacity-80">{content}</div>
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
