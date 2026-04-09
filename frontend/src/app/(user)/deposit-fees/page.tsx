"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, CircleDollarSign, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DepositFeesPage() {
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
        <div className="mb-6 flex items-center gap-3 border-b border-[#E0E7F0] pb-5">
          <Link
            href="/dashboard"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6D7E99] transition hover:bg-white hover:text-[#14213D]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
          </Link>
          <h1 className="text-[clamp(2rem,3.4vw,3rem)] font-semibold tracking-[-0.03em] text-[#14213D] [font-family:Georgia,serif]">
            Deposit Fee
          </h1>
        </div>

        <div className="rounded-[26px] border border-[#DFE6F0] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0B1630] text-white">
              <CircleDollarSign className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#B8851C]">
                Step 2
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#14213D]">
                Retainer payment is now available
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#657793]">
                Your agreement has been completed successfully. This page is now
                unlocked for the deposit fee workflow.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[22px] border border-dashed border-[#D8E0EC] bg-[#F8FAFD] p-6">
            <p className="text-base leading-7 text-[#5D6F8B]">
              Payment collection UI has not been implemented in this screen yet.
              The route is now available for step-2 users so onboarding can
              continue cleanly from the agreement flow.
            </p>
            <Button className="mt-5 h-12 rounded-2xl px-5">
              Payment Flow Coming Next
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
