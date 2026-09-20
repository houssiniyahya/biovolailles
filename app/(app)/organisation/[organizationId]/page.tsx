import { Bird, UserRound, Users, Warehouse } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/domain/PageHeader";
import { StatCard } from "@/components/domain/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { repositories } from "@/data/repositories";
import { isGlobalScope } from "@/domain/shared/scope";
import { requireModuleAccess } from "@/services/auth/guard";
import { listCooperativesInScope } from "@/services/identity/queries";
import { computeHierarchyCounts } from "@/services/identity/rollups";

export default async function OrganizationDetailPage({ params }: PageProps<"/organisation/[organizationId]">) {
  const session = await requireModuleAccess("ORGANIZATIONS");
  const { organizationId } = await params;

  const organization = await repositories.organizations.findById(organizationId);
  if (!organization) notFound();

  if (!isGlobalScope(session)) {
    const cooperative =
      session.scopeType === "COOPERATIVE" && session.scopeId
        ? await repositories.cooperatives.findById(session.scopeId)
        : null;
    if (!cooperative || cooperative.organizationId !== organization.id) redirect("/non-autorise");
  }

  const [cooperatives, counts] = await Promise.all([
    listCooperativesInScope(session).then((all) => all.filter((c) => c.organizationId === organization.id)),
    computeHierarchyCounts(session, { organizationId: organization.id }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Organisations", href: "/organisation" }, { label: organization.name }]}
        title={organization.name}
        description="Vue d'ensemble de l'organisation et navigation vers ses coopératives."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Coopératives" value={counts.cooperatives} icon={Users} />
        <StatCard label="Producteurs" value={counts.producers} icon={UserRound} />
        <StatCard label="Fermes" value={counts.farms} icon={Warehouse} />
        <StatCard label="Lots actifs" value={counts.activeLots} icon={Bird} hint={`${counts.totalLots} au total`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coopératives</CardTitle>
          <CardDescription>Coopératives rattachées à cette organisation.</CardDescription>
        </CardHeader>
        <CardContent>
          {cooperatives.length === 0 ? (
            <EmptyState title="Aucune coopérative" description="Aucune coopérative n'est encore rattachée." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {cooperatives.map((coop) => (
                <li key={coop.id} className="py-2.5">
                  <Link href={`/cooperatives/${coop.id}`} className="focus-ring text-sm font-medium text-text hover:text-bio-green">
                    {coop.name}
                  </Link>
                  <p className="text-xs text-secondary">{coop.region}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
