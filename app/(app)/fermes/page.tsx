import { MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/domain/PageHeader";
import { SearchableList } from "@/components/domain/SearchableList";
import { Card } from "@/components/ui/Card";
import { repositories } from "@/data/repositories";
import { requireModuleAccess } from "@/services/auth/guard";
import { listFarmsInScope } from "@/services/identity/queries";
import { listLotsInScope } from "@/services/production/lot-queries";

export default async function FarmListPage() {
  const session = await requireModuleAccess("FARMS");
  const [farms, lots] = await Promise.all([listFarmsInScope(session), listLotsInScope(session)]);
  const producers = await Promise.all(farms.map((farm) => repositories.producers.findById(farm.producerId)));
  const producerById = new Map(producers.filter(Boolean).map((p) => [p!.id, p!]));
  const buildings = await Promise.all(farms.map((farm) => repositories.buildings.listByFarm(farm.id)));
  const buildingsByFarm = new Map(farms.map((farm, i) => [farm.id, buildings[i]]));

  const activeLotCountByFarm = new Map<string, number>();
  for (const farm of farms) {
    const buildingIds = new Set((buildingsByFarm.get(farm.id) ?? []).map((b) => b.id));
    const count = lots.filter((lot) => lot.status === "ACTIF" && buildingIds.has(lot.buildingId)).length;
    activeLotCountByFarm.set(farm.id, count);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Fermes" description="Fermes de votre périmètre, entrée vers l'opération physique." />

      <SearchableList
        placeholder="Rechercher une ferme…"
        emptyTitle="Aucune ferme"
        emptyDescription="Aucune ferme dans votre périmètre."
        items={farms.map((farm) => {
          const activeLots = activeLotCountByFarm.get(farm.id) ?? 0;
          return {
            key: farm.id,
            searchText: `${farm.name} ${farm.city}`,
            content: (
              <Link href={`/fermes/${farm.id}`} className="focus-ring group block rounded-lg">
                <Card interactive>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{farm.name}</p>
                      <p className="flex items-center gap-1 text-xs text-secondary">
                        <MapPin className="size-3" aria-hidden="true" />
                        {farm.city} · {producerById.get(farm.producerId)?.name ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-secondary">
                      <span>{(buildingsByFarm.get(farm.id) ?? []).length} bâtiment(s)</span>
                      <Badge tone={activeLots > 0 ? "success" : "neutral"}>{activeLots} lot(s) actif(s)</Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            ),
          };
        })}
      />
    </div>
  );
}
