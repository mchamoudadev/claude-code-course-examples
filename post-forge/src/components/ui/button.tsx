"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import { Spinner } from "./spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "destructiveSolid";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium " +
  "transition-colors duration-150 cursor-pointer select-none " +
  "disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-[0_1px_2px_rgba(5,150,105,0.4)] hover:bg-primary-700 focus-visible:outline-primary-700",
  secondary:
    "bg-surface text-ink border border-border hover:bg-surface-sunken focus-visible:outline-primary-600",
  ghost:
    "bg-transparent text-body hover:bg-border-subtle focus-visible:outline-primary-600",
  destructive:
    "bg-surface text-error-fg border border-error-border font-semibold hover:bg-error-tint focus-visible:outline-error-strong",
  destructiveSolid:
    "bg-error-strong text-white font-semibold hover:bg-error-fg focus-visible:outline-error-fg",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-[34px] px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-[18px] text-[15px]",
};

const spinnerColor: Record<ButtonVariant, string> = {
  primary: "#ffffff",
  secondary: "var(--color-primary-600)",
  ghost: "var(--color-primary-600)",
  destructive: "var(--color-error-strong)",
  destructiveSolid: "#ffffff",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    >
      {loading ? (
        <Spinner
          size={size === "lg" ? 17 : 15}
          color={spinnerColor[variant]}
          trackColor="rgba(255,255,255,0.4)"
        />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
