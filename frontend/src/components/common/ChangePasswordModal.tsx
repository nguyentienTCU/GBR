"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Notification,
  type NotificationVariant,
} from "@/components/ui/Notification";
import { updateAuthenticatedUserPassword } from "@/lib/auth";

export type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    variant: NotificationVariant;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirm("");
    setNotice(null);
  }, [open]);

  const handleNoticeClose = useCallback(() => {
    let wasSuccess = false;
    setNotice((prev) => {
      wasSuccess = prev?.variant === "success";
      return null;
    });
    if (wasSuccess) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open || notice) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, notice, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const p = password.trim();
    const c = confirm.trim();
    if (!p || !c) {
      setNotice({
        variant: "error",
        message: "Please enter a new password.",
      });
      return;
    }
    if (p !== c) {
      setNotice({
        variant: "error",
        message: "Passwords do not match.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await updateAuthenticatedUserPassword(p);
      setNotice({
        variant: "success",
        message: "Your password was updated successfully.",
      });
    } catch (err) {
      setNotice({
        variant: "error",
        message:
          err instanceof Error ? err.message : "Could not update password.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {notice ? (
        <Notification
          open
          variant={notice.variant}
          message={notice.message}
          onClose={handleNoticeClose}
        />
      ) : null}

      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-[#071633]/50 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_18px_40px_rgba(8,22,50,0.15)]"
      >
        <div className="border-b border-[#e8ecf4] bg-[#071633] px-6 py-5">
          <h2
            id="change-password-title"
            className="text-xl font-semibold tracking-tight text-white"
          >
            Change password
          </h2>
          <p className="mt-1 text-sm text-white/85">
            Choose a new password for your account.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-[#142B57]"
              >
                New password
              </label>
              <div className="flex h-13 items-center rounded-xl border border-[#c8d2e3] bg-white px-4 shadow-sm">
                <Lock className="mr-3 h-5 w-5 text-[#8ea0bd]" />
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-base text-[#142B57] outline-none placeholder:text-[#8ea0bd]"
                  placeholder="Enter new password"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-[#142B57]"
              >
                Confirm password
              </label>
              <div className="flex h-13 items-center rounded-xl border border-[#c8d2e3] bg-white px-4 shadow-sm">
                <Lock className="mr-3 h-5 w-5 text-[#8ea0bd]" />
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-transparent text-base text-[#142B57] outline-none placeholder:text-[#8ea0bd]"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="inverse"
              className="w-full sm:w-auto"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Update password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
