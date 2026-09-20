"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { DataStatusBadge } from "@/components/domain/DataStatusBadge";
import { LotStatusBadge } from "@/components/domain/LotStatusBadge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { LOT_STATUS, type LotStatus } from "@/domain/shared/enums";
import { LOT_STATUS_LABEL } from "@/lib/status-colors";
import type { LotWithContext } from "@/services/production/lot-queries";

export function LotListClient({ lots }: { lots: LotWithContext[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LotStatus | "ALL">("ALL");
  const [farmId, setFarmId] = useState<string>("ALL");

  const farms = useMemo(() => {
    const map = new Map<string, string>();
    for (const lot of lots) {
      if (lot.farmId) map.set(lot.farmId, lot.farmName);
    }
    return Array.from(map.entries());
  }, [lots]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lots.filter((lot) => {
      if (status !== "ALL" && lot.status !== status) return false;
      if (farmId !== "ALL" && lot.farmId !== farmId) return false;
      if (q && !lot.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lots, query, status, farmId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            placeholder="Rechercher un lot (BU-2026-001)…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onChange={(event) => setStatus(event.target.value as LotStatus | "ALL")} className="w-48">
          <option value="ALL">Tous les statuts</option>
          {LOT_STATUS.map((s) => (
            <option key={s} value={s}>
              {LOT_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select value={farmId} onChange={(event) => setFarmId(event.target.value)} className="w-48">
          <option value="ALL">Toutes les fermes</option>
          {farms.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun lot"
          description={lots.length === 0 ? "Aucun lot dans votre périmètre." : "Aucun lot ne correspond à ces filtres."}
        />
      ) : (
        <Table caption="Lots du périmètre">
          <TableHeader>
            <TableRow>
              <TableHead>Lot</TableHead>
              <TableHead>Ferme / Bâtiment</TableHead>
              <TableHead>Espèce / Souche</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Population</TableHead>
              <TableHead>Données</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((lot) => (
              <TableRow key={lot.id}>
                <TableCell>
                  <Link href={`/lots/${lot.id}`} className="focus-ring font-medium text-bio-green hover:underline">
                    {lot.code}
                  </Link>
                </TableCell>
                <TableCell>
                  {lot.farmName} · {lot.buildingCode}
                </TableCell>
                <TableCell>
                  {lot.species} · {lot.breed}
                </TableCell>
                <TableCell>
                  <LotStatusBadge status={lot.status} />
                </TableCell>
                <TableCell>
                  {lot.currentPopulation.toLocaleString("fr-FR")}
                  <span className="text-secondary"> / {lot.initialPopulation.toLocaleString("fr-FR")}</span>
                </TableCell>
                <TableCell>
                  <DataStatusBadge status={lot.dataStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
