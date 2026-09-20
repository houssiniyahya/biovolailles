import { Layers } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/domain/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { repositories } from "@/data/repositories";
import { redirectIfOutOfScope, requireModuleAccess } from "@/services/auth/guard";
import { resolveFarmHierarchy } from "@/services/identity/scope-check";
import { listLotsInScope } from "@/services/production/lot-queries";
import { ZONE_TYPE_LABEL } from "@/lib/labels";


export default async function BuildingListPage({ params }: PageProps<"/fermes/[farmId]/batiments">) {
  const session = await requireModuleAccess("FARMS");
  const { farmId } = await params;

  const farm = await repositories.farms.findById(farmId);
  if (!farm) notFound();

  const path = await resolveFarmHierarchy(farmId);
  redirectIfOutOfScope(session, path);

  const [buildings, lots] = await Promise.all([
    repositories.buildings.listByFarm(farmId),
    listLotsInScope(session),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Fermes", href: "/fermes" }, { label: farm.name, href: `/fermes/${farm.id}` }, { label: "Bâtiments" }]}
        title={`Bâtiments — ${farm.name}`}
        description="FERME → BÂTIMENTS → LOTS : chaque bâtiment est le contexte physique des lots qu'il héberge."
      />

      {buildings.length === 0 ? (
        <EmptyState icon={Layers} title="Aucun bâtiment" description="Aucun bâtiment n'est encore enregistré pour cette ferme." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {buildings.map((building) => {
            const buildingLots = lots.filter((lot) => lot.buildingId === building.id);
            const activeLots = buildingLots.filter((lot) => lot.status === "ACTIF").length;
            return (
              <Link key={building.id} href={`/fermes/${farm.id}/batiments/${building.id}`}>
                <Card className="h-full transition-colors hover:border-bio-green">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {building.code} — {building.name}
                      </p>
                      <p className="text-xs text-secondary">{ZONE_TYPE_LABEL[building.zoneType] ?? building.zoneType}</p>
                    </div>
                    <span className="text-xs text-secondary">Cap. {building.capacity.toLocaleString("fr-FR")}</span>
                  </div>
                  <p className="mt-3 text-xs text-secondary">
                    {buildingLots.length} lot(s) · {activeLots} actif(s)
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
