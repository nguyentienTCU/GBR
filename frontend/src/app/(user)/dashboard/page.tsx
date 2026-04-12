"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CircleDollarSign, FileText, Lock, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUserStep } from "@/contexts/UserStepContext";
import { USER_STEP_ROUTES, isRouteCompletedForStep, isRouteUnlockedForStep } from "@/lib/user-step";

const steps = [
  {
    id: 1,
    title: "Buyer's Listing Agreement",
    description:
      "Sign the official brokerage agreement to commence our partnership as a buyer.",
    cta: "Start Task",
    href: USER_STEP_ROUTES.agreement,
    icon: FileText,
  },
  {
    id: 2,
    title: "Deposit Fee",
    description: "Submit your initial $5,000 retainer invoice securely.",
    cta: "Start Task",
    href: USER_STEP_ROUTES.depositFees,
    icon: CircleDollarSign,
  },
] as const;

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-[#EFF3F8]">
      <div
        className="h-full rounded-full bg-[#C9A65B] transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const { currentStep, isLoading } = useUserStep();
  const progress = isLoading ? 0 : Math.min(100, currentStep / 2 * 100);
  console.log("Current Step:", currentStep, "Progress:", progress);

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_right,_rgba(201,166,91,0.08),_transparent_22%),linear-gradient(180deg,_#F8FAFD_0%,_#F4F7FB_100%)]">
      <div className="border-b border-[#DDE5F0] bg-white/92 px-5 py-3 shadow-[0_2px_14px_rgba(10,17,32,0.05)] backdrop-blur sm:px-6 lg:px-10">
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#223250] bg-[#0B1630] px-3 py-2 text-sm font-semibold text-[#F5E6B8] shadow-[0_10px_24px_rgba(11,22,48,0.18)] transition hover:brightness-105"
          >
            <UserCircle2 className="h-5 w-5" strokeWidth={1.75} />
            <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
            <span>Book Strategy Session</span>
          </button>
        </div>
      </div>

      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 lg:px-10 lg:py-9">
        <div className="rounded-[28px] border border-[#E4EAF3] bg-white px-6 py-7 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:px-7 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.03em] text-[#14213D] [font-family:Georgia,serif]">
                Welcome, Client
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-[#6F809D]">
                Please complete the following steps to finalize your onboarding.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span className="text-[#51627F]">Overall Progress</span>
                <span className="text-[#D3A64F]">{progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {steps.map((step) => {
            const Icon = step.icon;
            const unlocked = isLoading ? step.id === 1 : isRouteUnlockedForStep(step.href, currentStep);
            const completed = isLoading ? false : isRouteCompletedForStep(step.href, currentStep);
            const badge = completed ? "Completed" : unlocked ? null : "Locked";

            return (
              <article
                key={step.id}
                className={`rounded-[24px] border bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)] transition sm:px-6 ${
                  unlocked
                    ? "border-[#D8B15B] shadow-[0_16px_38px_rgba(201,166,91,0.18)]"
                    : "border-[#E5EBF4]"
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={`flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border ${
                        unlocked
                          ? "border-[#DDE4EF] bg-[#0B1630] text-white"
                          : "border-[#DCE5F0] bg-[#F3F7FC] text-[#8DA0BD]"
                      }`}
                    >
                      <Icon className="h-7 w-7" strokeWidth={1.8} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2
                          className={`text-2xl font-semibold tracking-[-0.02em] ${
                            unlocked ? "text-[#14213D]" : "text-[#91A2BE]"
                          }`}
                        >
                          {`Step ${step.id}: ${step.title}`}
                        </h2>
                        {badge ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
                              completed
                                ? "bg-[#FFF7E6] text-[#B8851C]"
                                : "bg-[#EEF4FD] text-[#9AAECC]"
                            }`}
                          >
                            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                            {badge}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={`mt-2 max-w-3xl text-base ${
                          unlocked ? "text-[#657793]" : "text-[#A4B1C5]"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {unlocked ? (
                    <Link href={step.href} className="self-start lg:self-center">
                      <Button
                        variant="inverse"
                        className="h-12 min-w-36 rounded-2xl px-5 text-base text-[#F7E6B7]"
                      >
                        {completed ? "Review Step" : step.cta}
                        <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.25} />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="primary"
                      disabled
                      className="h-12 min-w-36 self-start rounded-2xl bg-[#E8EEF7] px-5 text-base text-[#A8B7CD] hover:brightness-100 lg:self-center"
                    >
                      {step.cta}
                      <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.25} />
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
