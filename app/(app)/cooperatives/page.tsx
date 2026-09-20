import Link from "next/link";
import { SearchableList } from "@/components/domain/SearchableList";
import { PageHeader } from "@/components/domain/PageHeader";
import { Card } from "@/components/ui/Card";
import { requireModuleAccess } from "@/services/auth/guard";
import { listCooperativesInScope } from "@/services/identity/queries";

export default async function CooperativeListPage() {
  const session = await requireModuleAccess("COOPERATIVES");
  const cooperatives = await listCooperativesInScope(session);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Coopératives" description="Coopératives de votre périmètre et leurs régions." />

      <SearchableList
        placeholder="Rechercher une coopérative…"
        emptyTitle="Aucune coopérative"
        emptyDescription="Aucune coopérative dans votre périmètre."
        items={cooperatives.map((coop) => ({
          key: coop.id,
          searchText: `${coop.name} ${coop.region}`,
          content: (
            <Link href={`/cooperatives/${coop.id}`} className="focus-ring group block rounded-lg">
              <Card interactive className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">{coop.name}</p>
                  <p className="text-xs text-secondary">{coop.region}</p>
                </div>
              </Card>
            </Link>
          ),
        }))}
      />
    </div>
  );
}
