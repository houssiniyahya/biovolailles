import { Bird, Mail, Phone, Warehouse } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/domain/PageHeader";
import { StatCard } from "@/components/domain/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { repositories } from "@/data/repositories";
import { redirectIfOutOfScope, requireModuleAccess } from "@/services/auth/guard";
import { listFarmsInScope } from "@/services/identity/queries";
import { computeHierarchyCounts } from "@/services/identity/rollups";
import { resolveProducerHierarchy } from "@/services/identity/scope-check";

export default async function ProducerDetailPage({ params }: PageProps<"/producteurs/[producerId]">) {
  const session = await requireModuleAccess("PRODUCERS");
  const { producerId } = await params;

  const producer = await repositories.producers.findById(producerId);
  if (!producer) notFound();

  const path = await resolveProducerHierarchy(producerId);
  redirectIfOutOfScope(session, path);

  const cooperative = await repositories.cooperatives.findById(producer.cooperativeId);

  const [farms, counts] = await Promise.all([
    listFarmsInScope(session).then((all) => all.filter((f) => f.producerId === producer.id)),
    computeHierarchyCounts(session, { producerId: producer.id }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Producteurs", href: "/producteurs" },
          { label: producer.name },
        ]}
        title={producer.name}
        description={cooperative ? `Coopérative : ${cooperative.name}` : undefined}
        meta={
          <span className="flex items-center gap-3 text-xs text-secondary">
            {producer.contactPhone ? (
              <span className="flex items-center gap-1">
                <Phone className="size-3" aria-hidden="true" />
                {producer.contactPhone}
              </span>
            ) : null}
            {producer.contactEmail ? (
              <span className="flex items-center gap-1">
                <Mail className="size-3" aria-hidden="true" />
                {producer.contactEmail}
              </span>
            ) : null}
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Fermes" value={counts.farms} icon={Warehouse} />
        <StatCard label="Lots actifs" value={counts.activeLots} icon={Bird} hint={`${counts.totalLots} au total`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fermes</CardTitle>
          <CardDescription>Fermes exploitées par ce producteur.</CardDescription>
        </CardHeader>
        <CardContent>
          {farms.length === 0 ? (
            <EmptyState title="Aucune ferme" description="Aucune ferme n'est encore rattachée." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {farms.map((farm) => (
                <li key={farm.id} className="py-2.5">
                  <Link href={`/fermes/${farm.id}`} className="focus-ring text-sm font-medium text-text hover:text-bio-green">
                    {farm.name}
                  </Link>
                  <p className="text-xs text-secondary">{farm.city}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
