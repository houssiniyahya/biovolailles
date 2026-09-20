import type { ReactNode } from "react";
import { type Crumb, Breadcrumbs } from "./Breadcrumbs";

export interface PageHeaderProps {
  breadcrumbs?: Crumb[];
  title: string;
  description?: string;
  /** Status badges shown beside the title. */
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ breadcrumbs, title, description, meta, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      {/*
       * Actions drop below the title on narrow screens instead of squeezing it — at 375px a
       * side-by-side row truncated long lot codes and left buttons half off-canvas (§17).
       */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-page-title min-w-0 wrap-break-word">{title}</h1>
            {meta ? <div className="flex flex-wrap items-center gap-1.5">{meta}</div> : null}
          </div>
          {description ? <p className="max-w-2xl text-sm leading-relaxed text-secondary">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
