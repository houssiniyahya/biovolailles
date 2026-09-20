"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn";

export const Tabs = TabsPrimitive.Root;

/**
 * The Lot page carries eight tabs, which at 375px overflowed the viewport and pushed the
 * later ones off-screen with no way to reach them (§17). The list now scrolls horizontally
 * on small screens and only collapses to a fitted inline row once there is room.
 */
export function TabsList({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 scrollbar-none [&::-webkit-scrollbar]:hidden">
      <TabsPrimitive.List
        className={cn("inline-flex w-max items-center gap-1 rounded-lg border border-border bg-background p-1", className)}
        {...props}
      />
    </div>
  );
}

export function TabsTrigger({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-secondary",
        "transition-colors hover:text-text",
        "data-[state=active]:bg-surface data-[state=active]:font-semibold data-[state=active]:text-text data-[state=active]:shadow-sm",
        className
      )}
      {...props}
    />
  );
}

/**
 * Count/severity pill inside a trigger, so the tab bar itself says where the problems are
 * instead of requiring the user to open every tab to find out.
 */
export function TabsBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "critical" }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-px text-micro font-bold tabular-nums",
        tone === "critical" ? "bg-critical/15 text-critical-strong" : "bg-border/70 text-secondary"
      )}
    >
      {children}
    </span>
  );
}

export function TabsContent({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4 focus-visible:outline-none", className)} {...props} />;
}
