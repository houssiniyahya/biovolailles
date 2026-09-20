import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  /** Say what is missing AND what the user can do about it (§20) — not just "aucune donnée". */
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background/50 px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-surface text-muted ring-1 ring-border">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-card-title">{title}</p>
        {description ? <p className="mx-auto max-w-sm text-caption leading-relaxed text-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
