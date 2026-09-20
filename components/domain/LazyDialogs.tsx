"use client";

import dynamic from "next/dynamic";
import { Pencil, Plus, PlusCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/Button";

/**
 * The create/edit dialogs pull in the whole client validation stack (react-hook-form +
 * @hookform/resolvers + Zod). Measured on the production server, that is a single 316 kB
 * chunk, and it was loading on first paint of /lots and /lots/[lotId] even though every one
 * of these dialogs is closed until the user clicks its trigger.
 *
 * Each export below renders a trigger button that is visually identical to the real one and
 * occupies the same box, so the header does not reflow when the chunk arrives (§24). The
 * placeholder is `disabled` for the moment it exists — never a button that looks live but
 * silently does nothing (§19).
 *
 * The forms themselves are untouched; only *when* their module loads has changed.
 */
function TriggerPlaceholder({
  label,
  icon: Icon,
  variant = "primary",
}: {
  label: string;
  icon: typeof Plus;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  return (
    <Button size="sm" variant={variant} disabled aria-hidden="true">
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}

export const LotCreateDialog = dynamic(
  () => import("@/app/(app)/lots/LotCreateDialog").then((m) => m.LotCreateDialog),
  { ssr: false, loading: () => <TriggerPlaceholder label="Nouveau lot" icon={Plus} /> }
);

export const LotEditDialog = dynamic(
  () => import("@/app/(app)/lots/[lotId]/LotEditDialog").then((m) => m.LotEditDialog),
  { ssr: false, loading: () => <TriggerPlaceholder label="Modifier" icon={Pencil} variant="secondary" /> }
);

export const EventCreateDialog = dynamic(
  () => import("@/app/(app)/lots/[lotId]/EventCreateDialog").then((m) => m.EventCreateDialog),
  {
    ssr: false,
    loading: () => <TriggerPlaceholder label="Ajouter un événement" icon={PlusCircle} variant="secondary" />,
  }
);

export const UserCreateDialog = dynamic(
  () => import("@/app/(app)/utilisateurs/UserCreateDialog").then((m) => m.UserCreateDialog),
  { ssr: false, loading: () => <TriggerPlaceholder label="Nouvel utilisateur" icon={Plus} /> }
);
