"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  UserCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Notification } from "@/components/ui/Notification";
import { useUserStep } from "@/contexts/UserStepContext";
import { useAgreementSync } from "@/contexts/AgreementSyncContext";
import { USER_STEP_ROUTES } from "@/lib/user-step";
import { getMySignedContractPdf } from "@/service/contracts.service";
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

  const [signingUrl, setSigningUrl] = useState("");
  const [isLoadingSigningUrl, setIsLoadingSigningUrl] = useState(false);
  const [signingError, setSigningError] = useState("");
  const [showSigningFrame, setShowSigningFrame] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isViewingSignedContract, setIsViewingSignedContract] = useState(false);
  const [signedContractError, setSignedContractError] = useState("");
  const [signedContractViewerUrl, setSignedContractViewerUrl] = useState("");

  const { currentStep } = useUserStep();

  const {
    isAgreementSyncing,
    pollingAttempts,
    agreementSyncError,
    shouldShowCompletionNotice,
    startAgreementSync,
    clearAgreementSyncError,
    markCompletionNoticeShown,
  } = useAgreementSync();

  const isAgreementComplete = !isAgreementSyncing && currentStep >= 1;

  const showPostSigningWaitingScreen =
    isAgreementSyncing && !showSigningFrame && !isAgreementComplete;

  const progressWidth = useMemo(
    () => `${Math.min(((pollingAttempts + 1) / 30) * 100, 92)}%`,
    [pollingAttempts],
  );

  async function handleStartSigning() {
    try {
      setShowSigningFrame(true);
      setIsLoadingSigningUrl(true);
      setSigningError("");
      clearAgreementSyncError();

      const response = await createRecipientView({
        return_url: `${window.location.origin}/agreement/return`,
      });

      setSigningUrl(response.signing_url);
    } catch (error) {
      setShowSigningFrame(false);
      setSigningError(
        error instanceof Error
          ? error.message
          : "Failed to load the DocuSign signing session.",
      );
    } finally {
      setIsLoadingSigningUrl(false);
    }
  }

  async function handleViewSignedContract() {
    try {
      setIsViewingSignedContract(true);
      setSignedContractError("");

      const pdf = await getMySignedContractPdf();
      const pdfUrl = URL.createObjectURL(pdf);
      setSignedContractViewerUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return pdfUrl;
      });
    } catch (error) {
      setSignedContractError(
        error instanceof Error
          ? error.message
          : "Failed to open the signed contract.",
      );
    } finally {
      setIsViewingSignedContract(false);
    }
  }

  function handleCloseSignedContractViewer() {
    setSignedContractViewerUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return "";
    });
  }

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "DOCUSIGN_SIGNING_DONE") return;

      setShowSigningFrame(false);
      setSigningUrl("");
      setSigningError("");
      startAgreementSync();
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [startAgreementSync]);

  useEffect(() => {
    if (!shouldShowCompletionNotice) return;

    setShowSigningFrame(false);
    setSigningUrl("");
    setNotificationOpen(true);
  }, [shouldShowCompletionNotice]);

  useEffect(() => {
    return () => {
      if (signedContractViewerUrl) {
        URL.revokeObjectURL(signedContractViewerUrl);
      }
    };
  }, [signedContractViewerUrl]);

  return (
    <div className="app-page min-h-dvh">
      <Notification
        open={notificationOpen}
        onClose={() => {
          setNotificationOpen(false);
          markCompletionNoticeShown();
        }}
        variant="success"
        title="Agreement Completed"
        message="Your signed agreement has been received. The next step is now unlocked."
      />

      <div className="border-b border-[var(--border)] bg-white px-5 py-3 sm:px-6 lg:px-10">
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"
          >
            <UserCircle2 className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
            <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.75} />
            <span>Book Strategy Session</span>
          </button>
        </div>
      </div>

      <section className="app-container max-w-5xl">
        <div className="mb-6 flex items-center gap-3 border-b border-[var(--border)] pb-5">
          <Link
            href="/dashboard"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-white hover:text-[var(--ink)]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
          </Link>
          <h1 className="text-3xl font-semibold text-[var(--ink)]">
            Buyer&apos;s Exclusive Representation Agreement
          </h1>
        </div>

        <div className="panel overflow-hidden">
          <div className="bg-white px-4 py-5 sm:px-5">
            {isAgreementComplete ? (
              <div className="rounded-lg border border-[#a8c8dc] bg-[#edf7fc] p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-white">
                      <CheckCircle2 className="h-7 w-7" strokeWidth={1.9} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent-dark)]">
                        Step 1 Complete
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)] sm:text-[1.9rem]">
                        Your agreement has already been signed
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7C97] sm:text-[0.95rem]">
                        We have your completed buyer representation agreement on
                        file. You do not need to sign again from this page.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-white px-6 py-6">
                    <div className="flex items-center gap-3">
                      <ShieldCheck
                        className="h-6 w-6 text-[var(--accent)]"
                        strokeWidth={2}
                      />
                      <p className="text-base font-semibold text-[#223250] sm:text-lg">
                        Next step unlocked
                      </p>
                    </div>
                    <p className="mt-3 max-w-sm text-base leading-7 text-[#4E617D]">
                      Continue to the deposit fee workflow when you are ready.
                    </p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        disabled={isViewingSignedContract}
                        className="h-14 rounded-2xl px-7 text-base sm:text-lg"
                        onClick={() => void handleViewSignedContract()}
                      >
                        <FileText className="mr-2 h-5 w-5" strokeWidth={2} />
                        {isViewingSignedContract
                          ? "Loading Contract..."
                          : signedContractViewerUrl
                            ? "Refresh Signed Contract"
                            : "View Signed Contract"}
                      </Button>
                      <Button
                        type="button"
                        className="h-14 rounded-2xl px-7 text-base sm:text-lg"
                        onClick={() => router.push(USER_STEP_ROUTES.depositFees)}
                      >
                        Go To Deposit Fee
                      </Button>
                    </div>
                    {signedContractError ? (
                      <p className="mt-3 text-sm font-medium text-[#B42318]">
                        {signedContractError}
                      </p>
                    ) : null}
                  </div>
                </div>

                {signedContractViewerUrl ? (
                  <div className="mt-5 overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                    <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#EAF3F8] text-[var(--accent)]">
                          <FileText className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#223250]">
                            Signed Contract
                          </p>
                          <p className="text-sm text-[#62738E]">
                            Buyer representation agreement
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[#223250] transition hover:bg-[var(--surface-muted)]"
                        onClick={handleCloseSignedContractViewer}
                      >
                        Close Viewer
                      </button>
                    </div>
                    <iframe
                      title="Signed contract PDF"
                      src={signedContractViewerUrl}
                      className="h-[720px] w-full bg-[#F7F9FC]"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {showPostSigningWaitingScreen ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-6 py-10 sm:px-10 sm:py-14">
                <div className="mx-auto max-w-2xl text-center">
                  <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-md bg-[var(--accent)] text-white">
                    <LoaderCircle className="h-8 w-8 animate-spin" strokeWidth={2} />
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#E8D9B0] bg-white px-4 py-2 text-sm font-semibold text-[#9A741A] shadow-sm">
                    <Sparkles className="h-4 w-4" strokeWidth={2} />
                    Finalizing your signed agreement
                  </div>

                  <h2 className="mt-5 text-3xl font-semibold text-[var(--ink)]">
                    Please hold on while we update your account
                  </h2>

                  <p className="mt-4 text-base leading-7 text-[#5F6F89]">
                    Your signature has been submitted successfully. We’re now
                    waiting for DocuSign and our backend to finish syncing your
                    completed agreement.
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-left">
                      <p className="text-sm font-semibold text-[#223250]">
                        Signature received
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#62738E]">
                        Your document was returned from DocuSign.
                      </p>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-left">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-[var(--accent)]" strokeWidth={2} />
                        <p className="text-sm font-semibold text-[#223250]">
                          Updating step status
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#62738E]">
                        We’re refreshing your account progress automatically.
                      </p>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-left">
                      <p className="text-sm font-semibold text-[#223250]">
                        Next step
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#62738E]">
                        Deposit fee will unlock as soon as syncing is complete.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 overflow-hidden rounded-full bg-[#E9EEF5]">
                    <div
                      className="h-2 rounded-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: progressWidth }}
                    />
                  </div>

                  <p className="mt-3 text-sm text-[#7A879C]">
                    First check starts after 4 seconds, then we retry every 2 seconds.
                  </p>
                </div>
              </div>
            ) : null}

            {showSigningFrame ? (
              <div className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                {signingUrl ? (
                  <iframe
                    title="DocuSign agreement signing"
                    src={signingUrl}
                    className="h-[780px] w-full bg-white"
                  />
                ) : (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-white" />
                    <div className="max-h-[390px] overflow-y-auto px-4 py-8 sm:px-8 lg:px-10">
                      <div className="mx-auto max-w-[700px] rounded-[4px] border border-[#E5EAF2] bg-white px-7 py-8 shadow-[0_14px_32px_rgba(15,23,42,0.06)] sm:px-10 sm:py-10">
                        {agreementSections.map((section, index) => (
                          <section
                            key={section.title}
                            className={index === 0 ? "" : "mt-10"}
                          >
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

            {!showSigningFrame &&
            !isAgreementComplete &&
            !showPostSigningWaitingScreen ? (
              <div className="rounded-lg border border-[var(--border)] bg-white">
                <div className="pointer-events-none max-h-[390px] overflow-y-auto px-4 py-8 sm:px-8 lg:px-10">
                  <div className="mx-auto max-w-[700px] rounded-[4px] border border-[#E5EAF2] bg-white px-7 py-8 shadow-[0_14px_32px_rgba(15,23,42,0.06)] sm:px-10 sm:py-10">
                    {agreementSections.map((section, index) => (
                      <section
                        key={section.title}
                        className={index === 0 ? "" : "mt-10"}
                      >
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
              <div className="mt-4 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-[#B42318]">
                  {signingError}
                </p>
              </div>
            ) : null}

            {agreementSyncError ? (
              <div className="mt-4 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-[#B42318]">
                  {agreementSyncError}
                </p>
              </div>
            ) : null}
          </div>

          {!isAgreementComplete && !showPostSigningWaitingScreen ? (
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
