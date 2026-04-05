"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export type NotificationVariant = "success" | "error";

export type NotificationProps = {
  open: boolean;
  onClose: () => void;
  variant: NotificationVariant;
  message: string;
  title?: string;
};

const defaultTitles: Record<NotificationVariant, string> = {
  success: "Success",
  error: "Error",
};

export function Notification({
  open,
  onClose,
  variant,
  message,
  title,
}: NotificationProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const heading = title ?? defaultTitles[variant];
  const isSuccess = variant === "success";

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-[#071633]/45 backdrop-blur-[2px]"
        aria-label="Dismiss notification"
        onClick={onClose}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notification-title"
        aria-describedby="notification-message"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[20px] bg-white shadow-[0_18px_40px_rgba(8,22,50,0.18)] sm:rounded-[24px]"
      >
        <div className="flex items-start gap-3 bg-[#071633] px-5 py-5 sm:px-6 sm:py-6">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isSuccess ? "bg-[#C9A65B]/20 text-[#C9A65B]" : "bg-red-500/15 text-red-300"
            }`}
            aria-hidden
          >
            {isSuccess ? (
              <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
            ) : (
              <AlertCircle className="h-6 w-6" strokeWidth={2} />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="notification-title"
              className="text-lg font-semibold tracking-tight text-white"
            >
              {heading}
            </h2>
            <p
              id="notification-message"
              className="mt-2 text-sm leading-relaxed text-white/90"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-[#e8ecf4] bg-[#f8f9fb] px-5 py-4 sm:px-6">
          <Button type="button" className="min-w-[100px]" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
