"use client";

import { useEffect, useMemo, useState } from "react";

import ClientTableRow from "@/components/admin/ClientTableRow";
import { Button } from "@/components/ui/button";
import { getUsers, resendVerificationEmail } from "@/service/users.service";
import type { User } from "@/types/user";
import AppLoadingScreen from "@/components/common/AppLoadingScreen";

function getFullName(user: User) {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.email;
}

export default function AdminClientsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [statusByUserId, setStatusByUserId] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    async function loadClients() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await getUsers();
        setUsers(data);
      } catch (err) {
        console.error("Failed to load clients:", err);
        setError("Failed to load clients.");
      } finally {
        setIsLoading(false);
      }
    }

    loadClients();
  }, []);

  const clients = useMemo(() => {
    return users.filter(
      (user) => user.role === "buyer" || user.role === "seller",
    );
  }, [users]);

  // =========================
  // summary counts
  // =========================

  const verifiedCount = useMemo(() => {
    return clients.filter((u) => u.email_verified).length;
  }, [clients]);

  const agreementCount = useMemo(() => {
    return clients.filter((u) => u.current_step === 1).length;
  }, [clients]);

  const depositCount = useMemo(() => {
    return clients.filter((u) => u.current_step === 2).length;
  }, [clients]);

  const completedCount = useMemo(() => {
    return clients.filter((u) => u.current_step === 0).length;
  }, [clients]);

  // =========================
  // modal logic
  // =========================

  function openVerificationModal(user: User) {
    if (user.email_verified) return;
    setSelectedUser(user);
    setIsModalOpen(true);
  }

  function closeVerificationModal() {
    if (isSendingVerification) return;
    setIsModalOpen(false);
    setSelectedUser(null);
  }

  async function handleSendVerification() {
    if (!selectedUser) return;

    try {
      setIsSendingVerification(true);

      const response = await resendVerificationEmail(selectedUser.id);

      setStatusByUserId((prev) => ({
        ...prev,
        [selectedUser.id]: response.message,
      }));

      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error("Failed to send verification email:", err);

      setStatusByUserId((prev) => ({
        ...prev,
        [selectedUser.id]: "Failed to send verification email.",
      }));
    } finally {
      setIsSendingVerification(false);
    }
  }

  // =========================
  // UI
  // =========================

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* HEADER */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-8 text-white lg:px-8">
            <h1 className="text-3xl font-semibold">Client Dashboard</h1>
            <p className="mt-2 text-sm text-slate-200">
              Monitor onboarding progress and manage client accounts.
            </p>
          </div>
        </section>

        {/* SUMMARY CARDS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* All Clients */}
          <div className="rounded-2xl border border-[#E5C07B] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#B8962E]">All Clients</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {clients.length}
            </p>
          </div>

          {/* Verified */}
          <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-orange-700">Verified</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {verifiedCount}
            </p>
            <p className="mt-1 text-sm font-medium text-orange-700">
              Email confirmed
            </p>
          </div>

          {/* Step 1 */}
          <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-blue-700">Step 1</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {agreementCount}
            </p>
            <p className="mt-1 text-sm font-medium text-blue-700">Agreement</p>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-purple-700">Step 2</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {depositCount}
            </p>
            <p className="mt-1 text-sm font-medium text-purple-700">
              Deposit Fee
            </p>
          </div>

          {/* Completed */}
          <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-emerald-700">Completed</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {completedCount}
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-700">
              Fully onboarded
            </p>
          </div>
        </section>

        {/* TABLE */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-900">
              Client Accounts
            </h2>
          </div>

          {isLoading ? (
            <AppLoadingScreen
              title="Loading clients"
              description="Fetching all client accounts and onboarding progress."
              variant="admin"
            />
          ) : error ? (
            <div className="px-6 py-10 text-sm text-red-600">{error}</div>
          ) : clients.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              No clients found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-sm text-slate-600">
                    <th className="px-6 py-4 font-semibold">User Name</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Current Step</th>
                    <th className="px-6 py-4 font-semibold">Email Confirmed</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {clients.map((user) => (
                    <ClientTableRow
                      key={user.id}
                      user={user}
                      isSending={
                        isSendingVerification && selectedUser?.id === user.id
                      }
                      statusMessage={statusByUserId[user.id] ?? null}
                      onOpenVerificationModal={openVerificationModal}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* MODAL */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#111827]">
              Send verification email
            </h3>

            <p className="mt-3 text-sm text-gray-600">
              Send verification email to{" "}
              <span className="font-medium text-[#111827]">
                {getFullName(selectedUser)}
              </span>
              ?
            </p>

            <p className="mt-2 text-sm text-gray-500">{selectedUser.email}</p>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={closeVerificationModal}
                disabled={isSendingVerification}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                onClick={handleSendVerification}
                disabled={isSendingVerification}
              >
                {isSendingVerification ? "Sending..." : "Send Verification"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
