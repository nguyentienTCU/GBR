"use client";

import Link from "next/link";

import type { User } from "@/types/user";

function formatRole(role: User["role"]) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatStep(step: number | null) {
  if (step === null) return "";

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

type ClientTableRowProps = {
  user: User;
  isSending?: boolean;
  statusMessage?: string | null;
  onOpenVerificationModal: (user: User) => void;
};

export default function ClientTableRow({
  user,
  isSending = false,
  statusMessage = null,
  onOpenVerificationModal,
}: ClientTableRowProps) {
  return (
    <tr className="border-t border-gray-200">
      <td className="px-4 py-4">
        <Link
          href={`/admin/clients/${user.id}`}
          className="font-medium text-[#111827] hover:text-[#1d4ed8] hover:underline"
        >
          {getFullName(user)}
        </Link>
      </td>

      <td className="px-4 py-4">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            user.role === "buyer"
              ? "bg-blue-100 text-blue-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {formatRole(user.role)}
        </span>
      </td>

      <td className="px-4 py-4 text-sm text-gray-700">
        {formatStep(user.current_step)}
      </td>

      <td className="px-4 py-4">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onOpenVerificationModal(user)}
            disabled={user.email_verified || isSending}
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium transition ${
              user.email_verified
                ? "cursor-not-allowed bg-green-100 text-green-700"
                : "bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer"
            }`}
          >
            {user.email_verified
              ? "Verified"
              : isSending
              ? "Sending..."
              : "Not verified"}
          </button>

          {statusMessage && (
            <span className="text-xs text-gray-500">{statusMessage}</span>
          )}
        </div>
      </td>
    </tr>
  );
}