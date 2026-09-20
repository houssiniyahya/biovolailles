import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  /** Written for an operator, not a developer (§20). Say what failed and what to do next. */
  message?: string;
  /** Next.js error digest. Shown small and copyable so support can correlate it — never a stack trace. */
  reference?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Cette page n'a pas pu être chargée",
  message = "Les données n'ont pas pu être récupérées. Réessayez ; si le problème persiste, transmettez la référence ci-dessous à un administrateur.",
  reference,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-critical/25 bg-critical/5 px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-surface text-critical-strong ring-1 ring-critical/25">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-section-title">{title}</p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-secondary">{message}</p>
      </div>
      {reference ? (
        <code className="rounded-md border border-border bg-surface px-2 py-1 text-caption text-secondary">
          Référence : {reference}
        </code>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}
