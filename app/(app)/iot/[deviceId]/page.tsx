import { notFound } from "next/navigation";
import Link from "next/link";
import { MeasurementChart } from "@/components/domain/LazyCharts";
import { PageHeader } from "@/components/domain/PageHeader";
import { ProvenancePanel } from "@/components/domain/ProvenancePanel";
import { Stat, StatGrid } from "@/components/domain/StatGrid";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { repositories } from "@/data/repositories";
import { redirectIfOutOfScope, requireModuleAccess } from "@/services/auth/guard";
import { resolveBuildingHierarchy } from "@/services/identity/scope-check";
import { describeProvenance } from "@/services/provenance/provenance-service";
import { DEVICE_STATUS_LABEL, MEASUREMENT_TYPE_LABEL } from "@/lib/labels";
import { DEVICE_STATUS_TONE } from "@/lib/status-colors";
import { LiveReading } from "./LiveReading";


export default async function DeviceDetailPage({ params }: PageProps<"/iot/[deviceId]">) {
  const session = await requireModuleAccess("IOT");
  const { deviceId } = await params;

  const device = await repositories.devices.findById(deviceId);
  if (!device) notFound();

  const path = await resolveBuildingHierarchy(device.buildingId);
  redirectIfOutOfScope(session, path);

  const building = await repositories.buildings.findById(device.buildingId);
  const farm = building ? await repositories.farms.findById(building.farmId) : null;
  const buildingLots = await repositories.lots.listByBuilding(device.buildingId);
  const activeLot = buildingLots.find((lot) => lot.status === "ACTIF") ?? null;

  const sensors = await repositories.sensors.listByDevice(device.id);
  const sensorHistories = await Promise.all(sensors.map((sensor) => repositories.measurements.listBySensor(sensor.id)));

  const sensorPanels = await Promise.all(
    sensors.map(async (sensor, index) => {
      const history = sensorHistories[index].slice(0, 100);
      const latest = history[0] ?? null;
      const provenance = latest
        ? await describeProvenance(latest, { occurredAt: latest.capturedAt, lotId: latest.lotId, buildingId: latest.buildingId })
        : null;
      return { sensor, history, provenance };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "IoT", href: "/iot" }, { label: device.code }]}
        title={device.code}
        meta={<Badge tone={DEVICE_STATUS_TONE[device.status]}>{DEVICE_STATUS_LABEL[device.status]}</Badge>}
        description={`${farm?.name ?? "—"} · ${building ? `${building.code} — ${building.name}` : "—"}${activeLot ? ` · Lot actif : ${activeLot.code}` : ""}`}
      />

      <StatGrid>
        <Stat label="Type" value={device.type === "CAPTEUR_MULTI" ? "Capteur multi" : "Passerelle"} hint={`${sensors.length} capteur(s)`} />
        <Stat label="Installé le" value={new Date(device.installedAt).toLocaleDateString("fr-FR")} />
        <Stat
          label="Dernière communication"
          value={device.lastCommunicationAt ? new Date(device.lastCommunicationAt).toLocaleDateString("fr-FR") : "—"}
          hint={device.lastCommunicationAt ? new Date(device.lastCommunicationAt).toLocaleTimeString("fr-FR") : undefined}
        />
        <Stat
          label="Batterie / Signal"
          value={`${device.batteryLevel !== null ? `${device.batteryLevel} %` : "—"} / ${device.signalQuality !== null ? `${device.signalQuality} %` : "—"}`}
          tone={device.batteryLevel !== null && device.batteryLevel < 20 ? "warning" : "default"}
        />
      </StatGrid>

      {activeLot ? (
        <p className="text-xs text-secondary">
          Lot associé :{" "}
          <Link href={`/lots/${activeLot.id}`} className="focus-ring font-medium text-bio-green hover:underline">
            {activeLot.code}
          </Link>
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {sensorPanels.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-xs text-secondary">Aucun capteur rattaché à cet appareil.</CardContent>
          </Card>
        ) : (
          sensorPanels.map(({ sensor, history, provenance }) => (
            <Card key={sensor.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{MEASUREMENT_TYPE_LABEL[sensor.sensorType]}</CardTitle>
                    <CardDescription>Unité : {sensor.unit}</CardDescription>
                  </div>
                  <Badge tone={DEVICE_STATUS_TONE[sensor.status]}>{DEVICE_STATUS_LABEL[sensor.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <LiveReading sensorId={sensor.id} unit={sensor.unit} dataStatus={provenance?.status} />
                <MeasurementChart
                  points={history.map((m) => ({ capturedAt: m.capturedAt, value: m.value }))}
                  unit={sensor.unit}
                  label={MEASUREMENT_TYPE_LABEL[sensor.sensorType]}
                />
                {provenance ? (
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="mb-3 text-overline">Provenance de la dernière mesure enregistrée</p>
                    {/* The panel renders the status badge itself — it was previously shown twice. */}
                    <ProvenancePanel summary={provenance} value={history[0]?.value ?? null} unit={sensor.unit} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

