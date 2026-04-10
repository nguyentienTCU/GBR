"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import UpdateUserProfileModal from "@/components/admin/UserProfileModal";
import { Button } from "@/components/ui/button";
import { getUserById, resendVerificationEmail } from "@/service/users.service";
import type { User } from "@/types/user";
import AppLoadingScreen from "@/components/common/AppLoadingScreen";

function formatRole(role: User["role"]) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatStep(step: number | null) {
  if (step === null) return "N/A";

  const stepMap: Record<number, string> = {
    1: "Agreement",
    2: "Deposit Fees",
  };

  return stepMap[step] ?? `Step ${step}`;
}

function getFullName(user: User) {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.email;
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-medium text-[#111827]">
        {value}
      </p>
    </div>
  );
}

function RoleBadge({ role }: { role: User["role"] }) {
  const formattedRole = formatRole(role);

  const roleClassName =
    role === "buyer"
      ? "bg-blue-100 text-blue-700"
      : role === "seller"
        ? "bg-emerald-100 text-emerald-700"
        : role === "admin"
          ? "bg-amber-100 text-amber-700"
          : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${roleClassName}`}
    >
      {formattedRole}
    </span>
  );
}

function StepBadge({ step }: { step: number | null }) {
  const value = formatStep(step);

  return (
    <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
      {value}
    </span>
  );
}

function VerificationBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
      Verified
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
      Not Verified
    </span>
  );
}

export default function AdminClientDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const hasFetchedRef = useRef(false);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationStatusMessage, setVerificationStatusMessage] = useState<
    string | null
  >(null);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (hasFetchedRef.current) return;

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

  async function handleSendVerificationEmail() {
    if (!user || user.email_verified) return;

    try {
      setIsSendingVerification(true);
      setVerificationStatusMessage(null);

      const response = await resendVerificationEmail(user.id);
      setVerificationStatusMessage(response.message);
    } catch (err) {
      console.error("Failed to send verification email:", err);
      setVerificationStatusMessage("Failed to send verification email.");
    } finally {
      setIsSendingVerification(false);
    }
  }

  function handleOpenUpdateModal() {
    setIsUpdateModalOpen(true);
  }

  function handleCloseUpdateModal() {
    setIsUpdateModalOpen(false);
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
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 lg:p-10">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-gray-500">User not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/clients"
          className="inline-flex items-center text-sm font-medium text-[#1d4ed8] hover:underline"
        >
          ← Back to Clients
        </Link>

        <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-[#0f172a] via-[#172554] to-[#1e3a8a] px-8 py-8 text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold text-white">
                  {user.first_name?.[0]?.toUpperCase() ||
                    user.email?.[0]?.toUpperCase() ||
                    "U"}
                </div>

                <div>
                  <h1 className="text-3xl font-semibold">
                    {getFullName(user)}
                  </h1>
                  <p className="mt-2 text-sm text-blue-100">{user.email}</p>
                  <p className="mt-1 text-xs text-blue-200">
                    User ID: {user.id}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <RoleBadge role={user.role} />
                <StepBadge step={user.current_step} />
                <VerificationBadge verified={user.email_verified} />
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[#111827]">
                Account Information
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Review the user’s personal and onboarding details.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailCard label="User ID" value={user.id} />
              <DetailCard label="First Name" value={user.first_name || "N/A"} />
              <DetailCard label="Last Name" value={user.last_name || "N/A"} />
              <DetailCard label="Email" value={user.email || "N/A"} />
              <DetailCard
                label="Phone Number"
                value={user.phone_number || "N/A"}
              />
              <DetailCard label="Role" value={formatRole(user.role)} />
              <DetailCard
                label="Current Step"
                value={formatStep(user.current_step)}
              />
              <DetailCard
                label="Company Name"
                value={user.company_name || "N/A"}
              />
              <DetailCard
                label="Email Verified"
                value={user.email_verified ? "Yes" : "No"}
              />
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-base font-semibold text-[#111827]">
                Account Actions
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage verification and profile actions for this user.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleOpenUpdateModal}
                >
                  Update User Profile
                </Button>

                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleSendVerificationEmail}
                  disabled={user.email_verified || isSendingVerification}
                >
                  {user.email_verified
                    ? "Email Already Verified"
                    : isSendingVerification
                      ? "Sending..."
                      : "Send Verification Email"}
                </Button>

                <Button variant="inverse" type="button">
                  Request Email Change
                </Button>
              </div>

              {verificationStatusMessage && (
                <p className="mt-3 text-sm text-gray-600">
                  {verificationStatusMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <UpdateUserProfileModal
        open={isUpdateModalOpen}
        user={user}
        onClose={handleCloseUpdateModal}
        onUpdated={(updatedUser) => {
          setUser(updatedUser);
          setIsUpdateModalOpen(false);
        }}
      />
    </div>
  );
}
