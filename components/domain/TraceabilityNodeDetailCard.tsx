import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataStatusBadge } from "@/components/domain/DataStatusBadge";
import { ProvenancePanel } from "@/components/domain/ProvenancePanel";
import type { ChainNode } from "@/services/traceability/entity-resolver";
import type { NodeDetail } from "@/services/traceability/node-detail";

/** One traceability node's full detail — the "click a node to open its detail" target (phase-7 brief §11) for every non-Lot stage. */
export function TraceabilityNodeDetailCard({ node, detail }: { node: ChainNode; detail: NodeDetail }) {
  return (
    <Card id={`node-${node.type}-${node.id}`} className="scroll-mt-20">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{node.label}</CardTitle>
          {node.dataStatus ? <DataStatusBadge status={node.dataStatus} /> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
          {detail.fields.map((field) => (
            <div key={field.label}>
              <dt className="font-medium uppercase tracking-wide text-secondary">{field.label}</dt>
              <dd className="mt-0.5 text-text">{field.value}</dd>
            </div>
          ))}
        </dl>
        {detail.provenance ? (
          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Provenance</p>
            <ProvenancePanel summary={detail.provenance} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
