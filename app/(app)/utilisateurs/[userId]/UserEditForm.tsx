"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ROLE, SCOPE_TYPE, type Role, type ScopeType } from "@/domain/shared/enums";
import { ROLE_LABEL, SCOPE_TYPE_LABEL } from "@/lib/labels";
import { setUserActiveAction, updateUserRoleAction, updateUserScopeAction } from "../actions";

type ScopeTarget = { id: string; label: string };
type ScopeTargets = Record<"ORGANIZATION" | "COOPERATIVE" | "PRODUCER" | "FARM", ScopeTarget[]>;

export function UserEditForm({
  userId,
  currentRole,
  currentScopeType,
  currentScopeId,
  currentActive,
  isSelf,
  scopeTargets,
}: {
  userId: string;
  currentRole: Role;
  currentScopeType: ScopeType;
  currentScopeId: string | null;
  currentActive: boolean;
  isSelf: boolean;
  scopeTargets: ScopeTargets;
}) {
  const router = useRouter();

  const [role, setRole] = useState<Role>(currentRole);
  const [roleReason, setRoleReason] = useState("");
  const [rolePending, setRolePending] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [scopeType, setScopeType] = useState<ScopeType>(currentScopeType);
  const [scopeId, setScopeId] = useState<string>(currentScopeId ?? "");
  const [scopeReason, setScopeReason] = useState("");
  const [scopePending, setScopePending] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  const [activePending, setActivePending] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  const targets = scopeType === "GLOBAL" ? [] : scopeTargets[scopeType];

  async function handleRoleSubmit() {
    setRolePending(true);
    setRoleError(null);
    const result = await updateUserRoleAction(userId, role, roleReason || undefined);
    setRolePending(false);
    if (!result.ok) {
      setRoleError(result.error?.message ?? "Modification impossible.");
      return;
    }
    router.refresh();
  }

  async function handleScopeSubmit() {
    if (scopeType !== "GLOBAL" && !scopeId) {
      setScopeError("Sélectionnez un périmètre.");
      return;
    }
    setScopePending(true);
    setScopeError(null);
    const result = await updateUserScopeAction(userId, scopeType, scopeType === "GLOBAL" ? null : scopeId, scopeReason || undefined);
    setScopePending(false);
    if (!result.ok) {
      setScopeError(result.error?.message ?? "Modification impossible.");
      return;
    }
    router.refresh();
  }

  async function handleActiveToggle() {
    setActivePending(true);
    setActiveError(null);
    const result = await setUserActiveAction(userId, !currentActive);
    setActivePending(false);
    if (!result.ok) {
      setActiveError(result.error?.message ?? "Modification impossible.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Rôle</CardTitle>
          <CardDescription>Change les permissions accordées à ce compte.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Rôle">
            {ROLE.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
          <Input placeholder="Motif (optionnel)" value={roleReason} onChange={(e) => setRoleReason(e.target.value)} />
          {roleError ? <p className="text-xs text-critical-strong">{roleError}</p> : null}
          <Button size="sm" variant="secondary" onClick={handleRoleSubmit} disabled={rolePending || role === currentRole}>
            Appliquer le nouveau rôle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Périmètre</CardTitle>
          <CardDescription>Détermine les données visibles par ce compte.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Select
            value={scopeType}
            onChange={(e) => {
              setScopeType(e.target.value as ScopeType);
              setScopeId("");
            }}
            aria-label="Type de périmètre"
          >
            {SCOPE_TYPE.map((s) => (
              <option key={s} value={s}>
                {SCOPE_TYPE_LABEL[s]}
              </option>
            ))}
          </Select>
          {scopeType !== "GLOBAL" ? (
            <Select value={scopeId} onChange={(e) => setScopeId(e.target.value)} aria-label="Périmètre">
              <option value="" disabled>
                Sélectionner…
              </option>
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </Select>
          ) : null}
          <Input placeholder="Motif (optionnel)" value={scopeReason} onChange={(e) => setScopeReason(e.target.value)} />
          {scopeError ? <p className="text-xs text-critical-strong">{scopeError}</p> : null}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleScopeSubmit}
            disabled={scopePending || (scopeType === currentScopeType && scopeId === (currentScopeId ?? ""))}
          >
            Appliquer le nouveau périmètre
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statut du compte</CardTitle>
          <CardDescription>
            {currentActive ? "Ce compte peut se connecter." : "Ce compte ne peut plus se connecter."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {activeError ? <p className="text-xs text-critical-strong">{activeError}</p> : null}
          {isSelf ? (
            <p className="text-xs text-secondary">Vous ne pouvez pas désactiver votre propre compte.</p>
          ) : (
            <Button size="sm" variant={currentActive ? "destructive" : "primary"} onClick={handleActiveToggle} disabled={activePending}>
              {currentActive ? "Désactiver le compte" : "Activer le compte"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
