"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
} from "lucide-react";

import UpdateUserProfileModal from "@/components/admin/UserProfileModal";
import AppLoadingScreen from "@/components/common/AppLoadingScreen";
import {
  Notification,
  type NotificationVariant,
} from "@/components/ui/Notification";
import { Button } from "@/components/ui/button";
import {
  getUserById,
  resendVerificationEmail,
  sendReminderEmail,
} from "@/service/users.service";
import { getUserSignedContractPdf } from "@/service/contracts.service";
import type { User } from "@/types/user";

function getFullName(user: User) {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.email;
}

function getRoleLabel(role: User["role"]) {
  const roleMap: Record<User["role"], string> = {
    admin: "Admin",
    mod: "Moderator",
    buyer: "Buyer",
    seller: "Seller",
  };

  return roleMap[role] ?? role;
}

function getStepLabel(step: number | null) {
  const stepMap: Record<number, string> = {
    0: "Agreement",
    1: "Deposit Fee",
    2: "Complete",
  };

  if (step === null) return "Unknown";
  return stepMap[step] ?? `Step ${step}`;
}

function getStepDescription(step: number | null) {
  if (step === 0) return "Agreement pending";
  if (step === 1) return "Deposit fee pending";
  if (step === 2) return "Onboarding complete";
  return "No progress reported";
}

function formatValue(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

function getWorkflowSteps(currentStep: number | null) {
  const step = currentStep ?? -1;

  return [
    {
      title: "Agreement",
      description: "Client reviews and signs the representation agreement.",
      state: step > 0 ? "completed" : step === 0 ? "active" : "pending",
    },
    {
      title: "Deposit Fee",
      description: "Client submits the required deposit payment.",
      state: step > 1 ? "completed" : step === 1 ? "active" : "pending",
    },
    {
      title: "Complete",
      description: "Client onboarding is complete.",
      state: step >= 2 ? "completed" : "pending",
    },
  ] as const;
}

function workflowStateClass(state: "completed" | "active" | "pending") {
  if (state === "completed") return "border-[var(--border)] text-[var(--ink)]";
  if (state === "active") return "border-[var(--ink)] text-[var(--ink)]";
  return "border-[var(--border)] text-[var(--text-muted)]";
}

export default function AdminClientDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const hasFetchedRef = useRef(false);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  const [contractViewerUrl, setContractViewerUrl] = useState<string | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    variant: NotificationVariant;
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!userId || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    async function loadUser() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getUserById(userId);
        setUser(data);
      } catch (err) {
        console.error("Failed to load user details:", err);
        setError("Failed to load user details.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadUser();
  }, [userId]);

  const workflowSteps = useMemo(
    () => getWorkflowSteps(user?.current_step ?? null),
    [user?.current_step],
  );
  const hasCompletedAgreement = (user?.current_step ?? -1) > 0;

  useEffect(() => {
    return () => {
      if (contractViewerUrl) {
        URL.revokeObjectURL(contractViewerUrl);
      }
    };
  }, [contractViewerUrl]);

  async function handleSendVerification() {
    if (!user || user.email_verified) return;

    try {
      setIsSendingVerification(true);
      const response = await resendVerificationEmail(user.id);
      setNotice({
        variant: "success",
        title: "Verification Sent",
        message: response.message,
      });
    } catch (err) {
      setNotice({
        variant: "error",
        title: "Verification Failed",
        message:
          err instanceof Error
            ? err.message
            : "Failed to send verification email.",
      });
    } finally {
      setIsSendingVerification(false);
    }
  }

  async function handleSendReminder() {
    if (!user || user.current_step === 2) return;

    try {
      setIsSendingReminder(true);
      const response = await sendReminderEmail(user.id);
      setNotice({
        variant: "success",
        title: "Reminder Sent",
        message: response.message,
      });
    } catch (err) {
      setNotice({
        variant: "error",
        title: "Reminder Failed",
        message:
          err instanceof Error ? err.message : "Failed to send reminder email.",
      });
    } finally {
      setIsSendingReminder(false);
    }
  }

  async function handleViewContract() {
    if (!user || !hasCompletedAgreement) return;

    try {
      setIsLoadingContract(true);
      setContractError(null);
      const pdfBlob = await getUserSignedContractPdf(user.id);
      const nextUrl = URL.createObjectURL(pdfBlob);

      setContractViewerUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return nextUrl;
      });
    } catch (err) {
      setContractError(
        err instanceof Error
          ? err.message
          : "Failed to load the signed contract.",
      );
    } finally {
      setIsLoadingContract(false);
    }
  }

  function handleCloseContractViewer() {
    setContractViewerUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return null;
    });
    setContractError(null);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center p-6 lg:p-10">
        <AppLoadingScreen
          title="Loading user details"
          description="Fetching the selected client profile and account information."
          variant="admin"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-10">
        <div className="rounded border border-red-200 bg-red-50 p-8">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 lg:p-10">
        <div className="panel p-8">
          <p className="text-sm text-[var(--text-muted)]">User not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page min-h-screen">
      {notice ? (
        <Notification
          open
          variant={notice.variant}
          title={notice.title}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      ) : null}

      <div
        className={`app-container max-w-7xl space-y-3 ${
          contractViewerUrl ? "" : "lg:h-[calc(100dvh-96px)] lg:overflow-hidden"
        }`}
      >
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to Clients
        </Link>

        <section className="border-b border-[var(--border)] bg-transparent pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold leading-tight text-[var(--ink)]">
                  {getFullName(user)}
                </h1>
                <span className="text-sm text-[var(--text-muted)]">
                  {getRoleLabel(user.role)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#5F6F89]">
                <span>{user.email}</span>
                <span>{formatValue(user.phone_number)}</span>
                <span>{formatValue(user.company_name)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                onClick={() => setIsUpdateModalOpen(true)}
              >
                Edit Profile
              </Button>
              <Button
                type="button"
                className="gap-2"
                disabled={isSendingReminder || user.current_step === 2}
                onClick={() => void handleSendReminder()}
              >
                {isSendingReminder ? "Sending..." : "Send Reminder"}
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-4">
          <div className="rounded border border-[var(--border)] bg-white p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Profile
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                {getFullName(user)}
              </p>
            </div>
            <div className="mt-5 space-y-1 text-sm text-[#5F6F89]">
              <p>{getRoleLabel(user.role)}</p>
              <p className="truncate">{formatValue(user.company_name)}</p>
            </div>
          </div>

          <div className="rounded border border-[var(--border)] bg-white p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Contact
              </p>
              <p className="mt-3 break-all text-sm font-semibold leading-5 text-[var(--ink)]">
                {user.email}
              </p>
            </div>
            <p className="mt-5 text-sm text-[#5F6F89]">{formatValue(user.phone_number)}</p>
          </div>

          <div className="rounded border border-[var(--border)] bg-white p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Verification
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                {user.email_verified ? "Verified" : "Unverified"}
              </p>
            </div>
            <button
              type="button"
              disabled={user.email_verified || isSendingVerification}
              onClick={() => void handleSendVerification()}
              className="mt-5 text-left text-sm font-semibold text-[var(--accent-dark)] disabled:cursor-not-allowed disabled:text-[var(--text-muted)]"
            >
              {isSendingVerification ? "Sending..." : "Resend verification"}
            </button>
          </div>

          <div className="rounded border border-[var(--border)] bg-white p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Current Step
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                {getStepLabel(user.current_step)}
              </p>
            </div>
            <p className="mt-5 text-sm leading-5 text-[#5F6F89]">
              {getStepDescription(user.current_step)}
            </p>
          </div>

          <div className="rounded border border-[var(--border)] bg-white p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Company
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--ink)]">
                {formatValue(user.company_name)}
              </p>
            </div>
            <p className="mt-5 text-sm text-[#5F6F89]">{getRoleLabel(user.role)}</p>
          </div>

          <div className="rounded border border-[var(--border)] bg-white p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Workflow
              </h2>
              <span className="text-sm font-medium text-[var(--text-muted)]">
                {getStepLabel(user.current_step)}
              </span>
            </div>
            <div className="mt-3 divide-y divide-[var(--border)]">
              {workflowSteps.map((step, index) => {
                const isComplete = step.state === "completed";
                const isActive = step.state === "active";

                return (
                  <div
                    key={step.title}
                    className="grid grid-cols-[28px_1fr_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${workflowStateClass(step.state)}`}
                    >
                      {isComplete ? <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> : index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{step.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[#5F6F89]">{step.description}</p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {isComplete ? "Done" : isActive ? "Current" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded border border-[var(--border)] bg-white p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Account ID
              </p>
              <p className="mt-3 break-all text-xs font-semibold leading-5 text-[var(--ink)]">
                {user.id}
              </p>
            </div>
          </div>

          <div className="rounded border border-[var(--border)] bg-white p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Actions
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                className="flex h-10 w-full items-center justify-between rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"
                onClick={() => setIsUpdateModalOpen(true)}
              >
                Edit Profile
              </button>
              <button
                type="button"
                disabled={user.current_step === 2 || isSendingReminder}
                className="flex h-10 w-full items-center justify-between rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleSendReminder()}
              >
                {isSendingReminder ? "Sending..." : "Send Reminder"}
              </button>
              {hasCompletedAgreement ? (
                <button
                  type="button"
                  disabled={isLoadingContract}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void handleViewContract()}
                >
                  {isLoadingContract ? "Loading..." : "View Contract"}
                </button>
              ) : null}
              {contractError ? (
                <p className="text-xs leading-5 text-red-600">{contractError}</p>
              ) : null}
            </div>
          </div>
        </section>

        {contractViewerUrl ? (
          <section className="rounded border border-[var(--border)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--ink)]">
                Signed Contract
              </h2>
              <button
                type="button"
                className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--ink)]"
                onClick={handleCloseContractViewer}
              >
                Close
              </button>
            </div>
            <iframe
              title="Signed contract PDF"
              src={contractViewerUrl}
              className="h-[58vh] w-full bg-white"
            />
          </section>
        ) : null}
      </div>

      <UpdateUserProfileModal
        open={isUpdateModalOpen}
        user={user}
        onClose={() => setIsUpdateModalOpen(false)}
        onUpdated={(updatedUser) => {
          setUser(updatedUser);
          setIsUpdateModalOpen(false);
          setNotice({
            variant: "success",
            title: "Profile Updated",
            message: "Client profile was updated successfully.",
          });
        }}
      />
    </div>
  );
}
