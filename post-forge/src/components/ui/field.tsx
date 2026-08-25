import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { AlertIcon } from "./icons";

export function Label({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-[12.5px] font-medium text-body", className)}
      {...props}
    >
      {children}
    </label>
  );
}

export function FieldError({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p className={cn("mt-2 flex items-center gap-2 text-[13px] text-error-fg", className)}>
      <AlertIcon size={15} className="shrink-0" />
      {children}
    </p>
  );
}

export function FieldHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-1.5 text-xs text-muted", className)}>{children}</p>;
}

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  error?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error wrapper. */
export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label ? (
        <Label htmlFor={htmlFor} className="mb-1.5">
          {label}
          {required ? <span className="ml-0.5 text-error-fg">*</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  );
}
