import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/**
 * Error styling keys off `aria-invalid`, so a field cannot look wrong without also being
 * announced as wrong to a screen reader (§18/§19) — the two can't drift apart.
 */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text",
        "placeholder:text-muted",
        "transition-[border-color,box-shadow] duration-150 hover:border-muted",
        "focus-ring focus-visible:border-bio-green",
        "aria-invalid:border-critical-strong aria-invalid:focus-visible:outline-critical-strong",
        "disabled:cursor-not-allowed disabled:bg-background disabled:text-secondary disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-caption font-semibold text-text", className)} {...props} />;
}

/** Inline validation/help text. `role="alert"` when it's an error, so it is announced. */
export function FieldMessage({
  children,
  tone = "hint",
  id,
}: {
  children: React.ReactNode;
  tone?: "hint" | "error";
  id?: string;
}) {
  return (
    <p
      id={id}
      role={tone === "error" ? "alert" : undefined}
      className={cn("text-caption", tone === "error" ? "font-medium text-critical-strong" : "text-secondary")}
    >
      {children}
    </p>
  );
}
