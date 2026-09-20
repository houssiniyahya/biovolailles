import { Radio } from "lucide-react";
import Link from "next/link";
import { DataStatusBadge } from "@/components/domain/DataStatusBadge";
import { PageHeader } from "@/components/domain/PageHeader";
import { StatCard } from "@/components/domain/StatCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { repositories } from "@/data/repositories";
import { summarizeDeviceHealth } from "@/domain/iot/device-health";
import { requireModuleAccess } from "@/services/auth/guard";
import { listDevicesInScope } from "@/services/iot/queries";
import { DEVICE_STATUS_LABEL } from "@/lib/labels";
import { DEVICE_STATUS_TONE } from "@/lib/status-colors";



export default async function IotDeviceListPage() {
  const session = await requireModuleAccess("IOT");
  const devices = await listDevicesInScope(session);
  const health = summarizeDeviceHealth(devices);

  const buildings = await repositories.buildings.list();
  const buildingById = new Map(buildings.map((b) => [b.id, b]));
  const farms = await repositories.farms.list();
  const farmById = new Map(farms.map((f) => [f.id, f]));
  const sensors = await Promise.all(devices.map((d) => repositories.sensors.listByDevice(d.id)));
  const sensorCountByDevice = new Map(devices.map((d, i) => [d.id, sensors[i].length]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="IoT — Santé des appareils" description="Appareils et capteurs de votre périmètre." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Appareils" value={health.total} icon={Radio} />
        <StatCard label="En ligne" value={health.online} />
        <StatCard label="Hors ligne" value={health.offline} />
        <StatCard label="En défaut" value={health.fault} />
      </div>

      {devices.length === 0 ? (
        <EmptyState icon={Radio} title="Aucun appareil" description="Aucun appareil IoT dans votre périmètre." />
      ) : (
        <Table caption="Appareils IoT du périmètre">
          <TableHeader>
            <TableRow>
              <TableHead>Appareil</TableHead>
              <TableHead>Emplacement</TableHead>
              <TableHead>Capteurs</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernière communication</TableHead>
              <TableHead>Données</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((device) => {
              const building = buildingById.get(device.buildingId);
              const farm = building ? farmById.get(building.farmId) : undefined;
              return (
                <TableRow key={device.id}>
                  <TableCell>
                    <Link href={`/iot/${device.id}`} className="focus-ring font-medium text-bio-green hover:underline">
                      {device.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {farm?.name ?? "—"} · {building ? `${building.code} — ${building.name}` : "—"}
                  </TableCell>
                  <TableCell>{sensorCountByDevice.get(device.id) ?? 0}</TableCell>
                  <TableCell>
                    <Badge tone={DEVICE_STATUS_TONE[device.status]}>{DEVICE_STATUS_LABEL[device.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    {device.lastCommunicationAt ? new Date(device.lastCommunicationAt).toLocaleString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell>
                    <DataStatusBadge status="SIMULATION" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
