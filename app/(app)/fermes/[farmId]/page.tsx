import { Bird, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/domain/PageHeader";
import { StatCard } from "@/components/domain/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { repositories } from "@/data/repositories";
import { redirectIfOutOfScope, requireModuleAccess } from "@/services/auth/guard";
import { listBuildingsInScope } from "@/services/identity/queries";
import { computeHierarchyCounts } from "@/services/identity/rollups";
import { resolveFarmHierarchy } from "@/services/identity/scope-check";
import { listLotsInScope } from "@/services/production/lot-queries";

export default async function FarmDetailPage({ params }: PageProps<"/fermes/[farmId]">) {
  const session = await requireModuleAccess("FARMS");
  const { farmId } = await params;

  const farm = await repositories.farms.findById(farmId);
  if (!farm) notFound();

  const path = await resolveFarmHierarchy(farmId);
  redirectIfOutOfScope(session, path);

  const producer = await repositories.producers.findById(farm.producerId);

  const [buildings, lots, counts] = await Promise.all([
    listBuildingsInScope(session).then((all) => all.filter((b) => b.farmId === farm.id)),
    listLotsInScope(session),
    computeHierarchyCounts(session, { farmId: farm.id }),
  ]);
  const buildingIds = new Set(buildings.map((b) => b.id));
  const farmLots = lots.filter((lot) => buildingIds.has(lot.buildingId));
  const currentPopulation = farmLots
    .filter((lot) => lot.status === "ACTIF")
    .reduce((sum, lot) => sum + lot.currentPopulation, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Fermes", href: "/fermes" }, { label: farm.name }]}
        title={farm.name}
        description={`${farm.city} · ${farm.region}`}
        meta={
          producer ? (
            <Link href={`/producteurs/${producer.id}`} className="focus-ring flex items-center gap-1 text-xs text-secondary hover:text-bio-green">
              <Users className="size-3" aria-hidden="true" />
              {producer.name}
            </Link>
          ) : null
        }
        actions={
          <Badge tone={counts.activeLots > 0 ? "success" : "neutral"}>
            {counts.activeLots > 0 ? "Ferme active" : "Aucun lot actif"}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Bâtiments" value={counts.buildings} icon={MapPin} />
        <StatCard label="Lots actifs" value={counts.activeLots} icon={Bird} hint={`${counts.totalLots} au total`} />
        <StatCard label="Population actuelle" value={currentPopulation.toLocaleString("fr-FR")} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bâtiments</CardTitle>
              <CardDescription>Contexte physique de la ferme — les lots y sont hébergés.</CardDescription>
            </div>
            <Link href={`/fermes/${farm.id}/batiments`} className="focus-ring text-xs font-medium text-bio-green hover:underline">
              Voir tous les bâtiments →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {buildings.length === 0 ? (
            <EmptyState title="Aucun bâtiment" description="Aucun bâtiment n'est encore enregistré pour cette ferme." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {buildings.map((building) => {
                const buildingLots = farmLots.filter((lot) => lot.buildingId === building.id);
                return (
                  <li key={building.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <Link
                        href={`/fermes/${farm.id}/batiments/${building.id}`}
                        className="focus-ring text-sm font-medium text-text hover:text-bio-green"
                      >
                        {building.code} — {building.name}
                      </Link>
                      <p className="text-xs text-secondary">Capacité {building.capacity.toLocaleString("fr-FR")}</p>
                    </div>
                    <span className="text-xs text-secondary">{buildingLots.length} lot(s)</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
