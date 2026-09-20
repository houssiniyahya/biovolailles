import { Bird, Radio } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DataStatusBadge } from "@/components/domain/DataStatusBadge";
import { IotEnvironmentSummary, type EnvironmentReading } from "@/components/domain/IotEnvironmentSummary";
import { LotStatusBadge } from "@/components/domain/LotStatusBadge";
import { PageHeader } from "@/components/domain/PageHeader";
import { StatCard } from "@/components/domain/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { repositories } from "@/data/repositories";
import { summarizeDeviceHealth } from "@/domain/iot/device-health";
import { canAccessModule } from "@/domain/shared/permissions";
import { DEVICE_STATUS_LABEL, MEASUREMENT_TYPE_LABEL, ZONE_TYPE_LABEL } from "@/lib/labels";
import { DEVICE_STATUS_TONE } from "@/lib/status-colors";
import { redirectIfOutOfScope, requireModuleAccess } from "@/services/auth/guard";
import { resolveBuildingHierarchy } from "@/services/identity/scope-check";



export default async function BuildingDetailPage({ params }: PageProps<"/fermes/[farmId]/batiments/[buildingId]">) {
  const session = await requireModuleAccess("FARMS");
  const { farmId, buildingId } = await params;

  const building = await repositories.buildings.findById(buildingId);
  if (!building) notFound();
  if (building.farmId !== farmId) redirect(`/fermes/${building.farmId}/batiments/${building.id}`);

  const path = await resolveBuildingHierarchy(buildingId);
  redirectIfOutOfScope(session, path);

  const farm = await repositories.farms.findById(building.farmId);
  const lots = await repositories.lots.listByBuilding(building.id);
  const population = lots.filter((lot) => lot.status === "ACTIF").reduce((sum, lot) => sum + lot.currentPopulation, 0);

  const canViewIot = canAccessModule(session, "IOT");
  const devices = canViewIot ? await repositories.devices.listByBuilding(building.id) : [];
  const health = summarizeDeviceHealth(devices);
  const sensorsByDevice = await Promise.all(devices.map((d) => repositories.sensors.listByDevice(d.id)));
  const sensorById = new Map(sensorsByDevice.flat().map((s) => [s.id, s]));
  const latestMeasurements = canViewIot ? await repositories.measurements.latestByBuilding(building.id) : [];
  const environmentReadings: EnvironmentReading[] = latestMeasurements
    .filter((m) => ["TEMPERATURE", "HUMIDITE", "CO2", "LUMIERE"].includes(sensorById.get(m.sensorId)?.sensorType ?? ""))
    .map((m) => ({
      label: MEASUREMENT_TYPE_LABEL[sensorById.get(m.sensorId)!.sensorType],
      value: m.value,
      unit: m.unit,
      dataStatus: m.dataStatus,
      capturedAt: m.capturedAt,
    }));
  const recentMeasurements = latestMeasurements
    .slice()
    .sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Fermes", href: "/fermes" },
          { label: farm?.name ?? "Ferme", href: `/fermes/${farmId}` },
          { label: "Bâtiments", href: `/fermes/${farmId}/batiments` },
          { label: building.code },
        ]}
        title={`${building.code} — ${building.name}`}
        description={farm ? `Ferme : ${farm.name}` : undefined}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Type" value={ZONE_TYPE_LABEL[building.zoneType] ?? building.zoneType} />
        <StatCard label="Capacité" value={building.capacity.toLocaleString("fr-FR")} />
        <StatCard label="Population actuelle" value={population.toLocaleString("fr-FR")} icon={Bird} />
        <StatCard label="Lots" value={lots.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lots hébergés</CardTitle>
          <CardDescription>Le bâtiment est le contexte physique — le lot reste l&apos;objet métier principal.</CardDescription>
        </CardHeader>
        <CardContent>
          {lots.length === 0 ? (
            <EmptyState title="Aucun lot" description="Aucun lot n'est encore hébergé dans ce bâtiment." />
          ) : (
            <Table caption="Lots hébergés dans ce bâtiment">
              <TableHeader>
                <TableRow>
                  <TableHead>Lot</TableHead>
                  <TableHead>Espèce / Souche</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Population</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell>
                      <Link href={`/lots/${lot.id}`} className="focus-ring font-medium text-bio-green hover:underline">
                        {lot.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {lot.species} · {lot.breed}
                    </TableCell>
                    <TableCell>
                      <LotStatusBadge status={lot.status} />
                    </TableCell>
                    <TableCell>{lot.currentPopulation.toLocaleString("fr-FR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canViewIot ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>IoT — Environnement du bâtiment</CardTitle>
                <CardDescription>Dernières mesures des capteurs actifs.</CardDescription>
              </div>
              <Link href="/iot" className="focus-ring flex items-center gap-1 text-xs font-medium text-bio-green hover:underline">
                <Radio className="size-3" aria-hidden="true" />
                {health.total} appareil(s) · {health.online} en ligne
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <IotEnvironmentSummary readings={environmentReadings} />

            {devices.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Appareils</p>
                <ul className="flex flex-col divide-y divide-border">
                  {devices.map((device) => (
                    <li key={device.id} className="flex items-center justify-between py-2">
                      <Link href={`/iot/${device.id}`} className="focus-ring text-sm font-medium text-bio-green hover:underline">
                        {device.code}
                      </Link>
                      <Badge tone={DEVICE_STATUS_TONE[device.status]}>{DEVICE_STATUS_LABEL[device.status]}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {recentMeasurements.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Mesures récentes</p>
                <Table caption="Appareils IoT installés dans ce bâtiment">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Valeur</TableHead>
                      <TableHead>Horodatage</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentMeasurements.map((measurement) => (
                      <TableRow key={measurement.id}>
                        <TableCell>{MEASUREMENT_TYPE_LABEL[sensorById.get(measurement.sensorId)?.sensorType ?? "TEMPERATURE"]}</TableCell>
                        <TableCell>
                          {measurement.value} {measurement.unit}
                        </TableCell>
                        <TableCell>{new Date(measurement.capturedAt).toLocaleString("fr-FR")}</TableCell>
                        <TableCell>
                          <DataStatusBadge status={measurement.dataStatus} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
