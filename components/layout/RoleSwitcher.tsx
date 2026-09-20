"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { switchDemoRoleAction } from "@/app/(app)/actions";
import { Select } from "@/components/ui/Select";
import { ROLE, type Role } from "@/domain/shared/enums";
import { ROLE_LABEL } from "@/lib/labels";

/**
 * Rapid role-demonstration switcher (phase-8 brief §6). Selecting a role calls
 * switchDemoRoleAction, which performs a REAL re-authentication against the seeded demo
 * account for that role (services/auth/demo-switch.ts) — not a client-side relabeling.
 */
export function RoleSwitcher({ currentRole }: { currentRole: Role }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(role: string) {
    if (role === currentRole) return;
    setPending(true);
    setError(null);
    const result = await switchDemoRoleAction(role);
    setPending(false);
    if (!result.ok) {
      setError(result.error?.message ?? "Changement de rôle impossible.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <RefreshCw className={pending ? "size-3.5 animate-spin text-muted" : "size-3.5 text-muted"} aria-hidden="true" />
        <Select
          value={currentRole}
          onChange={(e) => handleChange(e.target.value)}
          disabled={pending}
          aria-label="Changer de rôle (démo)"
          className="h-8 w-44 text-xs"
        >
          {ROLE.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
      </div>
      {error ? <p className="text-xs text-critical-strong">{error}</p> : null}
    </div>
  );
}
