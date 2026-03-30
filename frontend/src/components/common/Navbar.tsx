"use client";

import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full bg-[#081632] text-white">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-8 w-8">
            <Image
              src="/logo-gold.png"
              alt="GodBless Retirement logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight">
              GodBless Retirement
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#C9A65B]">
              Onboarding Portal
            </p>
          </div>
        </Link>

        <div className="text-sm font-medium text-gray-200">
          Secure Client Access
        </div>
      </div>
    </header>
  );
}
