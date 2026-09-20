import { PageHeader } from "@/components/domain/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { repositories } from "@/data/repositories";
import { ALERT_SEVERITY_LABEL, ALERT_SEVERITY_TONE } from "@/lib/status-colors";
import { requireModuleAccess } from "@/services/auth/guard";

export default async function SettingsPage() {
  await requireModuleAccess("SETTINGS");

  const [rules, organizations, cooperatives, producers, farms, buildings, lots, users, devices] = await Promise.all([
    repositories.rules.list(),
    repositories.organizations.list(),
    repositories.cooperatives.list(),
    repositories.producers.list(),
    repositories.farms.list(),
    repositories.buildings.list(),
    repositories.lots.list(),
    repositories.users.list(),
    repositories.devices.list(),
  ]);

  const counts: { label: string; value: number }[] = [
    { label: "Organisations", value: organizations.length },
    { label: "Coopératives", value: cooperatives.length },
    { label: "Producteurs", value: producers.length },
    { label: "Fermes", value: farms.length },
    { label: "Bâtiments", value: buildings.length },
    { label: "Lots", value: lots.length },
    { label: "Utilisateurs", value: users.length },
    { label: "Appareils IoT", value: devices.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Administration", href: "/administration" }, { label: "Paramètres" }]}
        title="Paramètres système"
        description="Informations sur la plateforme et règles du moteur d'alerte."
      />

      <Card>
        <CardHeader>
          <CardTitle>Vue d&apos;ensemble</CardTitle>
          <CardDescription>Volumétrie actuelle de la plateforme.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {counts.map((c) => (
            <div key={c.label}>
              <p className="text-xs text-secondary">{c.label}</p>
              <p className="text-xl font-semibold text-text">{c.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Règles d&apos;alerte</CardTitle>
          <CardDescription>Définitions du moteur de détection — lecture seule.</CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-secondary">Aucune règle définie.</p>
          ) : (
            <Table caption="Paramètres de la plateforme">
              <TableHeader>
                <TableRow>
                  <TableHead>Règle</TableHead>
                  <TableHead>Cible</TableHead>
                  <TableHead>Sévérité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium text-text">{rule.name}</TableCell>
                    <TableCell className="text-secondary">{rule.target}</TableCell>
                    <TableCell>
                      <Badge tone={ALERT_SEVERITY_TONE[rule.severity]}>{ALERT_SEVERITY_LABEL[rule.severity]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone={rule.active ? "success" : "neutral"}>{rule.active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="max-w-96 text-xs text-secondary">{rule.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
