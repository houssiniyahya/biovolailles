import Link from "next/link";
import { DataStatusBadge } from "@/components/domain/DataStatusBadge";
import { IotEnvironmentSummary, type EnvironmentReading } from "@/components/domain/IotEnvironmentSummary";
import { MeasurementChart } from "@/components/domain/LazyCharts";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DataStatus } from "@/domain/shared/enums";
import type { Device, Sensor } from "@/domain/iot/types";
import { MEASUREMENT_TYPE_LABEL } from "@/lib/labels";

const DEVICE_STATUS_TONE = { ONLINE: "success", OFFLINE: "neutral", FAULT: "critical" } as const;
const DEVICE_STATUS_LABEL = { ONLINE: "En ligne", OFFLINE: "Hors ligne", FAULT: "Défaut" } as const;

/**
 * Exactly the four fields this tab renders — not the full Measurement row. A lot accumulates
 * hundreds of readings (525 on the hero lot), and shipping every provenance column for each
 * one to the client cost ~190KB per page load for data nothing here reads. Provenance stays
 * available where it belongs: the Data tab and the device detail page.
 */
export interface LotMeasurementPoint {
  sensorId: string;
  capturedAt: string;
  value: number;
  dataStatus: DataStatus;
}

export interface IotTabData {
  devices: Device[];
  sensors: Sensor[];
  environmentReadings: EnvironmentReading[];
  history: LotMeasurementPoint[];
}

export function IotTab({ data }: { data: IotTabData }) {
  const historyBySensor = new Map<string, LotMeasurementPoint[]>();
  for (const measurement of data.history) {
    const list = historyBySensor.get(measurement.sensorId) ?? [];
    list.push(measurement);
    historyBySensor.set(measurement.sensorId, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Environnement actuel</CardTitle>
          <CardDescription>Dernières mesures des capteurs du bâtiment hébergeant ce lot.</CardDescription>
        </CardHeader>
        <CardContent>
          <IotEnvironmentSummary readings={data.environmentReadings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appareils connectés</CardTitle>
          <CardDescription>Appareils IoT du bâtiment de ce lot.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.devices.length === 0 ? (
            <EmptyState title="Aucun appareil" description="Aucun appareil IoT n'est encore installé dans ce bâtiment." />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.devices.map((device) => (
                <li key={device.id} className="flex items-center justify-between py-2">
                  <Link href={`/iot/${device.id}`} className="focus-ring text-sm font-medium text-bio-green hover:underline">
                    {device.code}
                  </Link>
                  <Badge tone={DEVICE_STATUS_TONE[device.status]}>{DEVICE_STATUS_LABEL[device.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {data.sensors.map((sensor) => {
        const history = historyBySensor.get(sensor.id) ?? [];
        return (
          <Card key={sensor.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{MEASUREMENT_TYPE_LABEL[sensor.sensorType]}</CardTitle>
                  <CardDescription>Historique pour ce lot — unité : {sensor.unit}</CardDescription>
                </div>
                <Badge tone={DEVICE_STATUS_TONE[sensor.status]}>{DEVICE_STATUS_LABEL[sensor.status]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <MeasurementChart points={history.map((m) => ({ capturedAt: m.capturedAt, value: m.value }))} unit={sensor.unit} />
              {history[0] ? (
                <div className="flex items-center justify-between text-xs text-secondary">
                  <span>Dernière lecture : {new Date(history[0].capturedAt).toLocaleString("fr-FR")}</span>
                  <DataStatusBadge status={history[0].dataStatus} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
