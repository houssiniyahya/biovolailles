import { Bird, UserRound, Warehouse } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/domain/PageHeader";
import { StatCard } from "@/components/domain/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { repositories } from "@/data/repositories";
import { requireModuleAccess, redirectIfOutOfScope } from "@/services/auth/guard";
import { listProducersInScope } from "@/services/identity/queries";
import { computeHierarchyCounts } from "@/services/identity/rollups";
import { resolveCooperativeHierarchy } from "@/services/identity/scope-check";

export default async function CooperativeDetailPage({ params }: PageProps<"/cooperatives/[cooperativeId]">) {
  const session = await requireModuleAccess("COOPERATIVES");
  const { cooperativeId } = await params;

  const cooperative = await repositories.cooperatives.findById(cooperativeId);
  if (!cooperative) notFound();

  const path = await resolveCooperativeHierarchy(cooperativeId);
  redirectIfOutOfScope(session, path);

  const [producers, counts] = await Promise.all([
    listProducersInScope(session).then((all) => all.filter((p) => p.cooperativeId === cooperative.id)),
    computeHierarchyCounts(session, { cooperativeId: cooperative.id }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Coopératives", href: "/cooperatives" }, { label: cooperative.name }]}
        title={cooperative.name}
        description={cooperative.region}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Producteurs" value={counts.producers} icon={UserRound} />
        <StatCard label="Fermes" value={counts.farms} icon={Warehouse} />
        <StatCard label="Lots actifs" value={counts.activeLots} icon={Bird} hint={`${counts.totalLots} au total`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Producteurs</CardTitle>
          <CardDescription>Producteurs rattachés à cette coopérative.</CardDescription>
        </CardHeader>
        <CardContent>
          {producers.length === 0 ? (
            <EmptyState title="Aucun producteur" description="Aucun producteur n'est encore rattaché." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {producers.map((producer) => (
                <li key={producer.id} className="py-2.5">
                  <Link
                    href={`/producteurs/${producer.id}`}
                    className="focus-ring text-sm font-medium text-text hover:text-bio-green"
                  >
                    {producer.name}
                  </Link>
                  {producer.contactPhone ? <p className="text-xs text-secondary">{producer.contactPhone}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
