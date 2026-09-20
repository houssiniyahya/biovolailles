import { PageHeader } from "@/components/domain/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { repositories } from "@/data/repositories";
import { AUDIT_ENTITY_TYPE_LABEL, auditEntityTypeLabel } from "@/lib/labels";
import { requireModuleAccess } from "@/services/auth/guard";
import { searchAuditLog } from "@/services/audit/queries";

function firstValue(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const session = await requireModuleAccess("AUDIT");
  const params = await searchParams;

  const q = firstValue(params.q);
  const actorId = firstValue(params.actorId);
  const entityType = firstValue(params.entityType);
  const entityId = firstValue(params.entityId);
  const relatedLotId = firstValue(params.relatedLotId);
  const from = firstValue(params.from);
  const to = firstValue(params.to);

  const [entries, users, lots] = await Promise.all([
    searchAuditLog(
      {
        q: q || undefined,
        actorId: actorId || undefined,
        entityType: entityType || undefined,
        entityId: entityId || undefined,
        relatedLotId: relatedLotId || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined,
      },
      session,
      300
    ),
    repositories.users.list(),
    repositories.lots.list(),
  ]);

  const userById = new Map(users.map((u) => [u.id, u.fullName]));
  const lotById = new Map(lots.map((l) => [l.id, l.code]));
  const knownEntityTypes = Object.keys(AUDIT_ENTITY_TYPE_LABEL);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Administration", href: "/administration" }, { label: "Audit" }]}
        title="Journal d'audit"
        description="Chaque mutation importante — acteur, avant/après, motif — dans l'ordre chronologique inverse."
      />

      <form method="get" className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="q">
            Recherche libre
          </Label>
          <Input id="q" name="q" defaultValue={q} placeholder="Champ, motif, valeur…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="actorId">
            Acteur
          </Label>
          <Select id="actorId" name="actorId" defaultValue={actorId}>
            <option value="">Tous</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="entityType">
            Entité
          </Label>
          <Select id="entityType" name="entityType" defaultValue={entityType}>
            <option value="">Toutes</option>
            {knownEntityTypes.map((t) => (
              <option key={t} value={t}>
                {AUDIT_ENTITY_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="relatedLotId">
            Lot
          </Label>
          <Select id="relatedLotId" name="relatedLotId" defaultValue={relatedLotId}>
            <option value="">Tous</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">
            Du
          </Label>
          <Input id="from" name="from" type="date" defaultValue={from} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">
            Au
          </Label>
          <Input id="to" name="to" type="date" defaultValue={to} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm">
            Filtrer
          </Button>
          <Button asChild type="button" size="sm" variant="ghost">
            <a href="/audit">Réinitialiser</a>
          </Button>
        </div>
      </form>

      {entries.length === 0 ? (
        <EmptyState title="Aucune entrée" description="Aucun événement ne correspond à ces filtres." />
      ) : (
        <Table caption="Journal d'audit des mutations">
          <TableHeader>
            <TableRow>
              <TableHead>Horodatage</TableHead>
              <TableHead>Acteur</TableHead>
              <TableHead>Entité</TableHead>
              <TableHead>Champ</TableHead>
              <TableHead>Avant</TableHead>
              <TableHead>Après</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Lot lié</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-secondary">{new Date(entry.createdAt).toLocaleString("fr-FR")}</TableCell>
                <TableCell>{entry.actorId ? (userById.get(entry.actorId) ?? "Utilisateur supprimé") : "Système"}</TableCell>
                <TableCell>
                  {auditEntityTypeLabel(entry.entityType)}
                  <span className="ml-1 text-xs text-secondary">#{entry.entityId.slice(0, 8)}</span>
                </TableCell>
                <TableCell className="text-secondary">{entry.field ?? "—"}</TableCell>
                <TableCell className="max-w-48 truncate font-mono text-xs" title={entry.oldValue ?? undefined}>
                  {entry.oldValue ?? "—"}
                </TableCell>
                <TableCell className="max-w-48 truncate font-mono text-xs" title={entry.newValue ?? undefined}>
                  {entry.newValue ?? "—"}
                </TableCell>
                <TableCell className="text-secondary">{entry.reason ?? "—"}</TableCell>
                <TableCell className="text-secondary">{entry.relatedLotId ? (lotById.get(entry.relatedLotId) ?? "—") : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
