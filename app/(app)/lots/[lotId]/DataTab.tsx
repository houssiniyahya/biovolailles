import type { ReactNode } from "react";
import { DataQualityCard } from "@/components/domain/DataQualityCard";
import { DataStatusBadge } from "@/components/domain/DataStatusBadge";
import { ProvenancePanel } from "@/components/domain/ProvenancePanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import type {
  EnvironmentMeasurementRecord,
  FeedUsageRecord,
  MortalityRecord,
  WaterUsageRecord,
  WeightMeasurementRecord,
} from "@/domain/production/types";
import type { ProvenanceSummary } from "@/domain/shared/provenance";
import { MEASUREMENT_TYPE_LABEL, SOURCE_TYPE_LABEL } from "@/lib/labels";
import type { LotDataQualitySummary } from "@/services/quality/lot-quality";

function fmtDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR");
}

export interface LotDataBundle {
  feed: FeedUsageRecord[];
  water: WaterUsageRecord[];
  weight: WeightMeasurementRecord[];
  mortality: MortalityRecord[];
  environment: EnvironmentMeasurementRecord[];
  quality: LotDataQualitySummary;
  latestProvenance: {
    feed: ProvenanceSummary | null;
    water: ProvenanceSummary | null;
    weight: ProvenanceSummary | null;
    mortality: ProvenanceSummary | null;
    environment: ProvenanceSummary | null;
  };
}

export function DataTab({ data }: { data: LotDataBundle }) {
  return (
    <div className="flex flex-col gap-4">
      <DataQualityCard summary={data.quality} />

      <CategorySection
        title="Aliment"
        description="Consommation d'aliment enregistrée pour ce lot."
        provenance={data.latestProvenance.feed}
        emptyLabel="Aucune donnée d'alimentation."
      >
        {data.feed.length > 0 ? (
          <Table caption="Relevés d'alimentation">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.feed.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{fmtDate(record.occurredAt)}</TableCell>
                  <TableCell>
                    {record.quantity} {record.unit}
                  </TableCell>
                  <TableCell>{record.feedType}</TableCell>
                  <TableCell>{SOURCE_TYPE_LABEL[record.sourceType]}</TableCell>
                  <TableCell>
                    <DataStatusBadge status={record.dataStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CategorySection>

      <CategorySection
        title="Eau"
        description="Consommation d'eau enregistrée pour le bâtiment ou le lot."
        provenance={data.latestProvenance.water}
        emptyLabel="Aucune donnée d'eau."
      >
        {data.water.length > 0 ? (
          <Table caption="Relevés de consommation d'eau">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.water.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{fmtDate(record.occurredAt)}</TableCell>
                  <TableCell>
                    {record.quantity} {record.unit}
                  </TableCell>
                  <TableCell>{SOURCE_TYPE_LABEL[record.sourceType]}</TableCell>
                  <TableCell>
                    <DataStatusBadge status={record.dataStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CategorySection>

      <CategorySection
        title="Poids"
        description="Pesées moyennes enregistrées pour ce lot."
        provenance={data.latestProvenance.weight}
        emptyLabel="Aucune pesée enregistrée."
      >
        {data.weight.length > 0 ? (
          <Table caption="Relevés de pesée">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Poids moyen</TableHead>
                <TableHead>Échantillon</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.weight.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{fmtDate(record.occurredAt)}</TableCell>
                  <TableCell>
                    {record.averageWeight} {record.unit}
                  </TableCell>
                  <TableCell>{record.sampleCount ?? "—"}</TableCell>
                  <TableCell>
                    <DataStatusBadge status={record.dataStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CategorySection>

      <CategorySection
        title="Mortalité"
        description="Un motif suspecté n'est pas un motif validé — jamais présenté comme un fait tant que non confirmé."
        provenance={data.latestProvenance.mortality}
        emptyLabel="Aucune mortalité enregistrée."
      >
        {data.mortality.length > 0 ? (
          <Table caption="Relevés de mortalité">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Sujets</TableHead>
                <TableHead>Motif suspecté</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.mortality.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{fmtDate(record.occurredAt)}</TableCell>
                  <TableCell>{record.count}</TableCell>
                  <TableCell>
                    {record.suspectedCause ? (
                      <span className={record.causeValidated ? "text-text" : "italic text-secondary"}>
                        {record.suspectedCause} {!record.causeValidated ? "(non validé)" : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <DataStatusBadge status={record.dataStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CategorySection>

      <CategorySection
        title="Environnement"
        description="Mesures environnementales du bâtiment — futur pont vers l'IoT."
        provenance={data.latestProvenance.environment}
        emptyLabel="Aucune mesure environnementale."
      >
        {data.environment.length > 0 ? (
          <Table caption="Relevés environnementaux">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.environment.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{fmtDate(record.occurredAt)}</TableCell>
                  <TableCell>{MEASUREMENT_TYPE_LABEL[record.measurementType]}</TableCell>
                  <TableCell>
                    {record.value} {record.unit}
                  </TableCell>
                  <TableCell>
                    <DataStatusBadge status={record.dataStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CategorySection>

      <Card>
        <CardHeader>
          <CardTitle>Production</CardTitle>
          <CardDescription>
            Les indicateurs calculés à partir de ces données structurées (population, mortalité, poids moyen, aliment, eau, FCR)
            sont dans l&apos;onglet <strong>Performance</strong> de ce lot.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function CategorySection({
  title,
  description,
  provenance,
  emptyLabel,
  children,
}: {
  title: string;
  description: string;
  provenance: ProvenanceSummary | null;
  emptyLabel: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {provenance ? null : <EmptyState title={emptyLabel} />}
        {children}
        {provenance ? (
          <div className="rounded-md border border-border bg-background p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
              Provenance du dernier enregistrement
            </p>
            <ProvenancePanel summary={provenance} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
