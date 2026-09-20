import Link from "next/link";
import { PageHeader } from "@/components/domain/PageHeader";
import { SearchableList } from "@/components/domain/SearchableList";
import { Card } from "@/components/ui/Card";
import { requireModuleAccess } from "@/services/auth/guard";
import { listProducersInScope } from "@/services/identity/queries";

export default async function ProducerListPage() {
  const session = await requireModuleAccess("PRODUCERS");
  const producers = await listProducersInScope(session);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Producteurs" description="Producteurs de votre périmètre." />

      <SearchableList
        placeholder="Rechercher un producteur…"
        emptyTitle="Aucun producteur"
        emptyDescription="Aucun producteur dans votre périmètre."
        items={producers.map((producer) => ({
          key: producer.id,
          searchText: `${producer.name} ${producer.contactEmail ?? ""}`,
          content: (
            <Link href={`/producteurs/${producer.id}`} className="focus-ring group block rounded-lg">
              <Card interactive className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">{producer.name}</p>
                  {producer.contactPhone ? <p className="text-xs text-secondary">{producer.contactPhone}</p> : null}
                </div>
              </Card>
            </Link>
          ),
        }))}
      />
    </div>
  );
}
