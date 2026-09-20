"use client";

import { Tabs, TabsBadge, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataStatusBadge } from "@/components/domain/DataStatusBadge";
import { DetailRow } from "@/components/domain/StatGrid";
import type { Lot, LotEvent } from "@/domain/production/types";
import type { KpiWithTrend } from "@/services/intelligence/performance-service";
import type { AlertWithContext } from "@/services/intelligence/queries";
import type { TraceabilityChain } from "@/services/traceability/chain";
import type { TraceabilityIssue } from "@/services/traceability/integrity";
import { AlertsTab } from "./AlertsTab";
import { DataTab, type LotDataBundle } from "./DataTab";
import { EventCreateDialog } from "@/components/domain/LazyDialogs";
import { EventsTimeline } from "./EventsTimeline";
import { IotTab, type IotTabData } from "./IotTab";
import { PassportTab, type PassportTabData } from "./PassportTab";
import { PerformanceTab } from "./PerformanceTab";
import { TraceabilityTab } from "./TraceabilityTab";

export function LotTabs({
  lot,
  events,
  canCreateEvent,
  data,
  iot,
  kpis,
  alerts,
  canRunDetection,
  traceability,
  passport,
}: {
  lot: Lot;
  events: LotEvent[];
  canCreateEvent: boolean;
  data: LotDataBundle;
  iot: IotTabData | null;
  kpis: KpiWithTrend[];
  alerts: AlertWithContext[];
  canRunDetection: boolean;
  traceability: { chain: TraceabilityChain; issues: TraceabilityIssue[] } | null;
  passport: PassportTabData | null;
}) {
  // Surfaced on the tab itself so an open alert is visible without opening the tab (§8).
  const openAlertCount = alerts.filter((entry) => entry.alert.status === "OPEN").length;

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Aperçu</TabsTrigger>
        <TabsTrigger value="data">Données</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        {iot ? <TabsTrigger value="iot">IoT</TabsTrigger> : null}
        <TabsTrigger value="alerts">
          Alertes
          {openAlertCount > 0 ? <TabsBadge tone="critical">{openAlertCount}</TabsBadge> : null}
        </TabsTrigger>
        {traceability ? (
          <TabsTrigger value="traceability">
            Traçabilité
            {traceability.issues.length > 0 ? <TabsBadge tone="critical">{traceability.issues.length}</TabsBadge> : null}
          </TabsTrigger>
        ) : null}
        {passport ? <TabsTrigger value="passport">QR / Passeport</TabsTrigger> : null}
        <TabsTrigger value="events">
          Événements
          {events.length > 0 ? <TabsBadge>{events.length}</TabsBadge> : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Identité</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col text-sm">
              <DetailRow label="Numéro de lot" value={lot.code} />
              <DetailRow label="Espèce" value={lot.species} />
              <DetailRow label="Souche" value={lot.breed} />
              <DetailRow label="Population initiale" value={lot.initialPopulation.toLocaleString("fr-FR")} />
              <DetailRow label="Population actuelle" value={lot.currentPopulation.toLocaleString("fr-FR")} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Planification</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col text-sm">
              <DetailRow label="Date de démarrage prévue" value={lot.plannedStartAt ?? "—"} />
              <DetailRow label="Date de démarrage réelle" value={lot.startedAt ? new Date(lot.startedAt).toLocaleDateString("fr-FR") : "—"} />
              <DetailRow label="Date de fin" value={lot.endedAt ? new Date(lot.endedAt).toLocaleDateString("fr-FR") : "—"} />
              <DetailRow label="Statut des données" value={<DataStatusBadge status={lot.dataStatus} />} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="data">
        <DataTab data={data} />
      </TabsContent>

      <TabsContent value="performance">
        <PerformanceTab kpis={kpis} />
      </TabsContent>

      {iot ? (
        <TabsContent value="iot">
          <IotTab data={iot} />
        </TabsContent>
      ) : null}

      <TabsContent value="alerts">
        <AlertsTab lotId={lot.id} alerts={alerts} canRunDetection={canRunDetection} />
      </TabsContent>

      {traceability ? (
        <TabsContent value="traceability">
          <TraceabilityTab lotId={lot.id} chain={traceability.chain} issues={traceability.issues} />
        </TabsContent>
      ) : null}

      {passport ? (
        <TabsContent value="passport">
          <PassportTab lotId={lot.id} data={passport} />
        </TabsContent>
      ) : null}

      <TabsContent value="events">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Historique des événements</CardTitle>
                <CardDescription>Chronologie des opérations enregistrées sur ce lot.</CardDescription>
              </div>
              {canCreateEvent ? <EventCreateDialog lotId={lot.id} currentPopulation={lot.currentPopulation} /> : null}
            </div>
          </CardHeader>
          <CardContent>
            <EventsTimeline events={events} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

