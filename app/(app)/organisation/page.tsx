import { Building2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/domain/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireModuleAccess } from "@/services/auth/guard";
import { listOrganizationsInScope } from "@/services/identity/queries";

export default async function OrganizationListPage() {
  const session = await requireModuleAccess("ORGANIZATIONS");
  const organizations = await listOrganizationsInScope(session);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organisations"
        description="Structures faîtières regroupant les coopératives de la plateforme."
      />

      {organizations.length === 0 ? (
        <EmptyState icon={Building2} title="Aucune organisation" description="Aucune organisation dans votre périmètre." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {organizations.map((org) => (
            <Link key={org.id} href={`/organisation/${org.id}`}>
              <Card className="h-full transition-colors hover:border-bio-green">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md bg-bio-green/10 text-bio-green">
                    <Building2 className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">{org.name}</p>
                    <p className="text-xs text-secondary">{org.type === "COOPERATIVE" ? "Coopérative" : org.type}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
