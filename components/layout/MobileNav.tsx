"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SidebarBrand, SidebarNav, type NavSection } from "./SidebarNav";

/**
 * Below `lg` the desktop rail is hidden, and before this component existed nothing replaced
 * it — the application had literally no navigation on a phone. Radix Dialog is already a
 * dependency and gives us the focus trap, Escape handling, scroll lock and `aria-modal`
 * for free, which is most of what makes a drawer accessible.
 */
export function MobileNav({ sections, demoMode }: { sections: NavSection[]; demoMode: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // A route change must close the drawer. onNavigate covers link clicks; this covers
  // back/forward and programmatic redirects. Adjusted during render rather than in an
  // effect — the effect form re-renders the whole subtree an extra time on every navigation.
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (open) setOpen(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className="focus-ring flex size-9 items-center justify-center rounded-md text-secondary transition-colors hover:bg-background hover:text-text lg:hidden"
        aria-label="Ouvrir le menu de navigation"
      >
        <Menu className="size-5" aria-hidden="true" />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in lg:hidden" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[17rem] max-w-[85vw] flex-col border-r border-border bg-surface shadow-xl lg:hidden"
          aria-label="Navigation principale"
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Accès aux modules de la plateforme BIOVOLAILLES.
          </DialogPrimitive.Description>

          <div className="relative">
            <SidebarBrand demoMode={demoMode} />
            <DialogPrimitive.Close
              className="focus-ring absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-secondary transition-colors hover:bg-background hover:text-text"
              aria-label="Fermer le menu"
            >
              <X className="size-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <SidebarNav sections={sections} onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
