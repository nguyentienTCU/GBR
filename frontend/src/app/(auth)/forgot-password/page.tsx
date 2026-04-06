"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const nextEmail = email.trim();

    if (!nextEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(nextEmail);
      setSuccess(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not send reset email.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-[575px]">
        <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] sm:rounded-[24px]">
          <div className="relative overflow-hidden bg-[#071633] px-5 py-8 text-white sm:px-8 sm:py-10">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-white/10 sm:h-28 sm:w-28" />

            <div className="relative flex flex-col items-center text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16">
                <svg
                  width="54"
                  height="54"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-[#C9A65B]"
                >
                  <path
                    d="M12 3L18.5 5.5V11.5C18.5 16 15.7 19.6 12 21C8.3 19.6 5.5 16 5.5 11.5V5.5L12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.8 11.8L11.3 13.3L14.8 9.8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Forgot password
              </h1>
              <p className="mt-3 max-w-sm text-sm text-white/90">
                Enter your email and we&apos;ll send you a password reset link.
              </p>
            </div>
          </div>

          <div className="px-5 py-7 sm:px-8 sm:py-9">
            {success ? (
              <div className="space-y-5">
                <p className="text-sm leading-6 text-[#142B57]">
                  If an account exists for that email, we sent a password reset
                  link. Please check your inbox.
                </p>

                <Button
                  type="button"
                  className="h-13 w-full sm:h-14"
                  onClick={() => router.push("/login")}
                >
                  Back to login
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleRequestReset}
                className="space-y-5 sm:space-y-6"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-[15px] font-medium text-[#142B57]"
                  >
                    Email Address
                  </label>
                  <div className="flex h-13 items-center rounded-xl border border-[#c8d2e3] bg-white px-4 shadow-sm sm:h-14">
                    <Mail className="mr-3 h-5 w-5 text-[#8ea0bd]" />
                    <input
                      id="email"
                      type="email"
                      placeholder="client@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full min-w-0 bg-transparent text-base text-[#142B57] outline-none placeholder:text-[#8ea0bd] sm:text-[17px]"
                    />
                  </div>
                </div>

                {errorMessage ? (
                  <p className="text-sm text-red-600">{errorMessage}</p>
                ) : null}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-13 w-full sm:h-14"
                >
                  {loading ? "Sending..." : "Request password reset"}
                  {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-[#142B57] hover:underline"
                  >
                    Back to login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="mt-6 px-2 text-center text-sm leading-6 text-[#5f7396] sm:mt-8 sm:text-[15px] sm:leading-7">
          If you continue having trouble accessing your account, please contact
          your GodBless Retirement advisor directly.
        </p>
      </div>
    </div>
  );
}
