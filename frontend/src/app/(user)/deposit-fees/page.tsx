"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  UserCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Notification } from "@/components/ui/Notification";
import { useRouteProgress } from "@/contexts/RouteProgressContext";
import { createInvoice } from "@/service/quickbooks.service";

const DEPOSIT_FEE_AMOUNT = 5000;

export default function DepositFeesPage() {
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [billEmail, setBillEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const routeProgress = useRouteProgress();

  async function handleCreateInvoice() {
    try {
      setIsCreatingInvoice(true);
      setErrorMessage("");
      routeProgress.start({ minDurationMs: 1100 });

      const response = await createInvoice({
        amount: DEPOSIT_FEE_AMOUNT,
        customer_memo: "Initial deposit fee invoice",
        private_note: "Created from the deposit fee onboarding page.",
      });

      setBillEmail(response.bill_email);
      setNotificationOpen(true);
      setIsCreatingInvoice(false);
      routeProgress.complete();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create the QuickBooks invoice.",
      );
      setIsCreatingInvoice(false);
      routeProgress.fail();
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top_right,_rgba(201,166,91,0.08),_transparent_22%),linear-gradient(180deg,_#F8FAFD_0%,_#F4F7FB_100%)]">
      <Notification
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        variant="success"
        title="Payment Email Sent"
        message={`Your QuickBooks invoice has been created and emailed${billEmail ? ` to ${billEmail}` : ""}. Please check your inbox for the payment link.`}
      />

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
                Your agreement has been completed successfully. Send your
                $5,000 QuickBooks deposit invoice email from this page to continue the
                payment workflow.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[22px] border border-dashed border-[#D8E0EC] bg-[#F8FAFD] p-6">
            <p className="text-base leading-7 text-[#5D6F8B]">
              This screen creates the QuickBooks invoice for the logged-in user
              and immediately asks QuickBooks to send the invoice email to the
              billing email on file.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button
                type="button"
                disabled={isCreatingInvoice}
                onClick={() => void handleCreateInvoice()}
                className="h-12 rounded-2xl px-5"
              >
                {isCreatingInvoice ? "Sending Payment Email..." : "Send Payment Email"}
              </Button>
            </div>

            {errorMessage ? (
              <div className="mt-4 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-[#B42318]">
                  {errorMessage}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-[22px] border border-[#E7ECF3] bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#B8851C]">
              Invoice Summary
            </p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-base text-[#5D6F8B]">Deposit fee amount</p>
              <p className="text-2xl font-semibold tracking-[-0.03em] text-[#14213D]">
                $5,000
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#7A879C]">
              Clicking Send Payment Email creates the QuickBooks invoice and
              asks QuickBooks to email it to the billing address. Webhooks still
              sync the transaction record using the stored QuickBooks invoice ID.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
