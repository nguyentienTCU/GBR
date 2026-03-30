"use client";

import { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { signInWithEmail } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const data = await signInWithEmail(email, password);
      if (!data.session) {
        setErrorMessage("No session returned.");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Sign in failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f3f4f6] px-4 py-10">
        <div className="w-full max-w-[575px]">
          <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <div className="relative overflow-hidden bg-[#071633] px-8 py-10 text-white">
              <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-white/10" />

              <div className="relative flex flex-col items-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full">
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

                <h1 className="text-5xl font-semibold tracking-tight text-white">
                  Welcome
                </h1>
                <p className="mt-3 text-sm text-white/90">
                  Exclusive access for invited clients &amp; partners.
                </p>
              </div>
            </div>

            <div className="px-8 py-9">
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-[15px] font-medium text-[#142B57]"
                  >
                    Email Address
                  </label>
                  <div className="flex h-14 items-center rounded-xl border border-[#c8d2e3] bg-white px-4 shadow-sm">
                    <Mail className="mr-3 h-5 w-5 text-[#8ea0bd]" />
                    <input
                      id="email"
                      type="email"
                      placeholder="client@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-[17px] text-[#142B57] outline-none placeholder:text-[#8ea0bd]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-[15px] font-medium text-[#142B57]"
                  >
                    Password
                  </label>
                  <div className="flex h-14 items-center rounded-xl border border-[#c8d2e3] bg-white px-4 shadow-sm">
                    <Lock className="mr-3 h-5 w-5 text-[#8ea0bd]" />
                    <input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent text-[17px] text-[#142B57] outline-none placeholder:text-[#8ea0bd]"
                    />
                  </div>
                </div>

                {errorMessage ? (
                  <p className="text-sm text-red-600">{errorMessage}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-14 w-full items-center justify-center rounded-xl bg-[#C9A65B] text-base font-semibold text-[#071633] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Signing in..." : "Access Portal"}
                  {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                </button>
              </form>
            </div>
          </div>

          <p className="mt-8 text-center text-[15px] leading-7 text-[#5f7396]">
            If you haven&apos;t received an invitation, please contact your
            GodBless Retirement advisor directly.
          </p>
        </div>
      </div>
  );
}
