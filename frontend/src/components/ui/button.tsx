"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

const baseClassName =
  "inline-flex h-13 shrink-0 cursor-pointer items-center justify-center rounded-xl px-6 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70";

/** Gold background, navy text */
const primaryClassName =
  "bg-[#C9A65B] text-[#071633] hover:brightness-95";

/** Navy background, gold text */
const inverseClassName =
  "bg-[#071633] text-[#C9A65B] hover:brightness-110";

const variantClassNames = {
  primary: primaryClassName,
  inverse: inverseClassName,
} as const;

export type ButtonVariant = keyof typeof variantClassNames;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className = "", variant = "primary", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={`${baseClassName} ${variantClassNames[variant]} ${className}`.trim()}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
