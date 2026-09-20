import Link from "next/link";
import { PageHeader } from "@/components/domain/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { repositories } from "@/data/repositories";
import { ROLE_LABEL, SCOPE_TYPE_LABEL } from "@/lib/labels";
import { requireModuleAccess } from "@/services/auth/guard";
import { describeScopeTarget, listUsers } from "@/services/identity/user-management";
import { UserCreateDialog } from "@/components/domain/LazyDialogs";

export default async function UsersListPage() {
  const session = await requireModuleAccess("USERS");

  const [users, organizations, cooperatives, producers, farms] = await Promise.all([
    listUsers(session),
    repositories.organizations.list(),
    repositories.cooperatives.list(),
    repositories.producers.list(),
    repositories.farms.list(),
  ]);

  const scopeLabels = await Promise.all(users.map((u) => describeScopeTarget(u.scopeType, u.scopeId)));

  const scopeTargets = {
    ORGANIZATION: organizations.map((o) => ({ id: o.id, label: o.name })),
    COOPERATIVE: cooperatives.map((c) => ({ id: c.id, label: c.name })),
    PRODUCER: producers.map((p) => ({ id: p.id, label: p.name })),
    FARM: farms.map((f) => ({ id: f.id, label: f.name })),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Administration", href: "/administration" }, { label: "Utilisateurs" }]}
        title="Utilisateurs"
        description="Comptes, rôles et périmètres d'accès de la plateforme."
        actions={<UserCreateDialog scopeTargets={scopeTargets} />}
      />

      {users.length === 0 ? (
        <EmptyState title="Aucun utilisateur" description="Aucun compte n'existe encore." />
      ) : (
        <Table caption="Comptes utilisateurs">
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Périmètre</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernière activité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, i) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Link href={`/utilisateurs/${user.id}`} className="focus-ring font-medium text-bio-green hover:underline">
                    {user.fullName}
                  </Link>
                </TableCell>
                <TableCell className="text-secondary">{user.email}</TableCell>
                <TableCell>{ROLE_LABEL[user.role]}</TableCell>
                <TableCell>
                  {SCOPE_TYPE_LABEL[user.scopeType]}
                  {user.scopeType !== "GLOBAL" ? ` — ${scopeLabels[i]}` : ""}
                </TableCell>
                <TableCell>
                  <Badge tone={user.active ? "success" : "neutral"}>{user.active ? "Actif" : "Désactivé"}</Badge>
                </TableCell>
                <TableCell className="text-secondary">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("fr-FR") : "Jamais connecté"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
