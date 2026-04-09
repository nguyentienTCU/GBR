"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Notification } from "@/components/ui/Notification";
import { useUserStep } from "@/contexts/UserStepContext";
import { USER_STEP_ROUTES } from "@/lib/user-step";
import { createRecipientView } from "@/service/docusign.service";

const agreementSections = [
  {
    title: "BUYER'S EXCLUSIVE REPRESENTATION AGREEMENT",
    body: "This placeholder represents the agreement content area where the embedded DocuSign recipient view will render once the signing integration is wired to the backend.",
  },
  {
    title: "1. APPOINTMENT OF BROKER",
    body: "Client hereby appoints Broker as Client's sole and exclusive agent to represent Client in the acquisition of target businesses, assets, or equity interests.",
  },
  {
    title: "2. TERM",
    body: "The term of this Agreement shall commence on the Effective Date and shall continue for a period of twelve months unless earlier terminated by the parties.",
  },
  {
    title: "3. RETAINER FEE",
    body: "A deposit fee will follow this signing step. That payment step remains locked until the agreement is completed.",
  },
] as const;

export default function AgreementPage() {
  const router = useRouter();
  const signingFrameRef = useRef<HTMLIFrameElement | null>(null);
  const redirectTimeoutRef = useRef<number | null>(null);
  const hasHandledCompletionRef = useRef(false);
  const [signingUrl, setSigningUrl] = useState("");
  const [isLoadingSigningUrl, setIsLoadingSigningUrl] = useState(false);
  const [signingError, setSigningError] = useState("");
  const [showSigningFrame, setShowSigningFrame] = useState(false);
  const [isPollingStep, setIsPollingStep] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const {
    currentStep,
    isLoading: isStepLoading,
    refreshCurrentStep,
  } = useUserStep();
  const isAgreementComplete = !isPollingStep && currentStep >= 2;

  async function handleStartSigning() {
    try {
      setShowSigningFrame(true);
      setIsLoadingSigningUrl(true);
      setSigningError("");

      const response = await createRecipientView({
        return_url: `${window.location.origin}/agreement?signingReturn=1`,
      });

      setSigningUrl(response.signing_url);
    } catch (error) {
      setSigningError(
        error instanceof Error
          ? error.message
          : "Failed to load the DocuSign signing session.",
      );
    } finally {
      setIsLoadingSigningUrl(false);
    }
  }

  function handleSigningFrameLoad() {
    const frame = signingFrameRef.current;
    if (!frame?.contentWindow) return;

    try {
      const iframeUrl = new URL(frame.contentWindow.location.href);
      if (iframeUrl.origin !== window.location.origin) {
        return;
      }

      if (
        iframeUrl.pathname === USER_STEP_ROUTES.agreement &&
        iframeUrl.searchParams.get("signingReturn") === "1"
      ) {
        hasHandledCompletionRef.current = false;
        setShowSigningFrame(false);
        setSigningUrl("");
        setIsPollingStep(true);
        void refreshCurrentStep();
      }
    } catch {
      // The iframe is cross-origin until DocuSign returns control back to our app.
    }
  }

  useEffect(() => {
    if (!isPollingStep) return;

    const intervalId = window.setInterval(() => {
      void refreshCurrentStep();
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [isPollingStep, refreshCurrentStep]);

  useEffect(() => {
    if (
      !isPollingStep ||
      isStepLoading ||
      currentStep < 2 ||
      notificationOpen ||
      hasHandledCompletionRef.current
    ) {
      return;
    }

    hasHandledCompletionRef.current = true;
    setIsPollingStep(false);
    setNotificationOpen(true);
    redirectTimeoutRef.current = window.setTimeout(() => {
      router.push(USER_STEP_ROUTES.depositFees);
    }, 1800);

    return () => {
      if (redirectTimeoutRef.current != null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [currentStep, isPollingStep, isStepLoading, notificationOpen, router]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current != null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_right,_rgba(201,166,91,0.08),_transparent_22%),linear-gradient(180deg,_#F8FAFD_0%,_#F4F7FB_100%)]">
      <Notification
        open={notificationOpen}
        onClose={() => {
          hasHandledCompletionRef.current = true;
          setNotificationOpen(false);
          router.push(USER_STEP_ROUTES.depositFees);
        }}
        variant="success"
        title="Agreement Completed"
        message="Your signed agreement has been received. Redirecting you to the deposit fee step now."
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
            Buyer&apos;s Exclusive Representation Agreement
          </h1>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-[#DFE6F0] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="bg-[#FBFCFE] px-4 py-5 sm:px-5">
            {isAgreementComplete ? (
              <div className="rounded-[22px] border border-[#E7D3A1] bg-[linear-gradient(135deg,_#FFFDF7_0%,_#FFF7E4_100%)] p-6 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0B1630] text-[#F5E6B8] shadow-[0_14px_30px_rgba(11,22,48,0.16)]">
                      <CheckCircle2 className="h-7 w-7" strokeWidth={1.9} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#B8851C]">
                        Step 1 Complete
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#14213D]">
                        Your agreement has already been signed
                      </h2>
                      <p className="mt-3 max-w-2xl text-base leading-7 text-[#5F6F89]">
                        We have your completed buyer representation agreement on
                        file. You do not need to sign again from this page.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-white/70 bg-white/70 p-5 shadow-[0_12px_28px_rgba(20,33,61,0.06)] backdrop-blur">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-[#B8851C]" strokeWidth={2} />
                      <p className="text-sm font-semibold text-[#223250]">
                        Next step unlocked
                      </p>
                    </div>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-[#62738E]">
                      Continue to the deposit fee workflow when you are ready.
                    </p>
                    <Button
                      type="button"
                      className="mt-4 h-12 rounded-2xl px-5"
                      onClick={() => router.push(USER_STEP_ROUTES.depositFees)}
                    >
                      Go To Deposit Fee
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {isPollingStep ? (
              <div className="mb-4 flex items-center gap-3 rounded-[18px] border border-[#E6D4A4] bg-[#FFF9ED] px-4 py-3 text-sm text-[#7A5B14]">
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} />
                <p>
                  Waiting for DocuSign confirmation. We are checking your current
                  onboarding step every 2 seconds.
                </p>
              </div>
            ) : null}

            {showSigningFrame ? (
              <div className="relative overflow-hidden rounded-[20px] border border-[#E2E8F2] bg-white">
                {signingUrl ? (
                  <iframe
                    ref={signingFrameRef}
                    title="DocuSign agreement signing"
                    src={signingUrl}
                    onLoad={handleSigningFrameLoad}
                    className="h-[780px] w-full bg-white"
                  />
                ) : (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-white via-white/96 to-transparent" />
                    <div className="max-h-[390px] overflow-y-auto px-4 py-8 sm:px-8 lg:px-10">
                      <div className="mx-auto max-w-[700px] rounded-[4px] border border-[#E5EAF2] bg-white px-7 py-8 shadow-[0_14px_32px_rgba(15,23,42,0.06)] sm:px-10 sm:py-10">
                        {agreementSections.map((section, index) => (
                          <section key={section.title} className={index === 0 ? "" : "mt-10"}>
                            <h2
                              className={`text-[#20304C] [font-family:Georgia,serif] ${
                                index === 0
                                  ? "text-center text-[clamp(1.55rem,2.7vw,2.1rem)] font-semibold"
                                  : "text-[1.8rem] font-semibold"
                              }`}
                            >
                              {section.title}
                            </h2>
                            <p className="mt-5 text-[1.05rem] leading-8 text-[#3D516E]">
                              {section.body}
                            </p>
                          </section>
                        ))}

                        <div className="mt-10 space-y-7">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="space-y-3">
                              <div className="h-4 w-full rounded-full bg-[#EEF3F9]" />
                              <div className="h-4 w-[92%] rounded-full bg-[#EEF3F9]" />
                              <div className="h-4 w-[68%] rounded-full bg-[#EEF3F9]" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pointer-events-none absolute bottom-0 right-0 top-0 flex w-4 justify-center bg-[#353535]">
                      <div className="mt-12 h-28 w-2 rounded-full bg-[#C7C7C7]" />
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {!showSigningFrame && !isAgreementComplete ? (
              <div className="rounded-[20px] border border-[#E2E8F2] bg-white">
                <div className="pointer-events-none max-h-[390px] overflow-y-auto px-4 py-8 sm:px-8 lg:px-10">
                  <div className="mx-auto max-w-[700px] rounded-[4px] border border-[#E5EAF2] bg-white px-7 py-8 shadow-[0_14px_32px_rgba(15,23,42,0.06)] sm:px-10 sm:py-10">
                    {agreementSections.map((section, index) => (
                      <section key={section.title} className={index === 0 ? "" : "mt-10"}>
                        <h2
                          className={`text-[#20304C] [font-family:Georgia,serif] ${
                            index === 0
                              ? "text-center text-[clamp(1.55rem,2.7vw,2.1rem)] font-semibold"
                              : "text-[1.8rem] font-semibold"
                          }`}
                        >
                          {section.title}
                        </h2>
                        <p className="mt-5 text-[1.05rem] leading-8 text-[#3D516E]">
                          {section.body}
                        </p>
                      </section>
                    ))}

                    <div className="mt-10 space-y-7">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="space-y-3">
                          <div className="h-4 w-full rounded-full bg-[#EEF3F9]" />
                          <div className="h-4 w-[92%] rounded-full bg-[#EEF3F9]" />
                          <div className="h-4 w-[68%] rounded-full bg-[#EEF3F9]" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {signingError ? (
              <p className="px-2 pt-4 text-sm font-medium text-[#B42318]">{signingError}</p>
            ) : null}
          </div>

          {!isAgreementComplete ? (
            <div className="border-t border-[#E4EAF3] px-4 py-4 sm:px-5">
              <Button
                type="button"
                disabled={isLoadingSigningUrl || Boolean(signingUrl)}
                onClick={() => void handleStartSigning()}
                className="mt-4 h-13 w-full rounded-2xl bg-[#E1E8F2] text-base font-semibold text-[#91A2BE] hover:brightness-100"
              >
                {isLoadingSigningUrl
                  ? "Loading agreement..."
                  : signingUrl
                    ? "Agreement Loaded"
                    : "Start Signing"}
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
