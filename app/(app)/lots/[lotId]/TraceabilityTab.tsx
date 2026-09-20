import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TraceabilityChain } from "@/services/traceability/chain";
import type { TraceabilityIssue } from "@/services/traceability/integrity";

/**
 * The Lot page's "Traçabilité" tab (phase-7 brief §12) — a compact summary (status/origin/
 * links/verification state); the full graph + timeline live on the dedicated page this
 * links to (§10), so this tab stays light on an already-busy page.
 */
export function TraceabilityTab({ lotId, chain, issues }: { lotId: string; chain: TraceabilityChain; issues: TraceabilityIssue[] }) {
  const downstreamNodes = chain.nodes.filter((n) => n.type !== "LOT");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Traçabilité</CardTitle>
            <CardDescription>Origine, liens amont/aval et état de vérification pour ce lot.</CardDescription>
          </div>
          <Link href={`/lots/${lotId}/tracabilite`} className="focus-ring text-sm font-medium text-bio-green hover:underline">
            Voir la traçabilité complète →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryStat label="Origine" value={chain.upstream[0]?.name ?? "—"} />
          <SummaryStat label="Liens amont" value={String(chain.upstream.length)} />
          <SummaryStat label="Liens aval" value={String(downstreamNodes.length)} />
          <SummaryStat
            label="Vérification"
            value={issues.length === 0 ? "Cohérente" : `${issues.length} problème(s)`}
            tone={issues.length === 0 ? "text-success-strong" : "text-critical-strong"}
          />
        </div>

        {downstreamNodes.length === 0 ? (
          <EmptyState
            title="Aucune donnée aval"
            description="Aucune collecte, abattage, transformation ou produit encore enregistré pour ce lot."
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
            {downstreamNodes.map((node) => (
              <Link
                key={`${node.type}-${node.id}`}
                href={`/lots/${lotId}/tracabilite#node-${node.type}-${node.id}`}
                className="focus-ring rounded-full border border-border px-2.5 py-1 text-secondary transition-colors hover:border-bio-green hover:text-bio-green"
              >
                {node.code}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption font-medium uppercase tracking-wide text-secondary">{label}</span>
      <span className={`text-sm font-semibold ${tone ?? "text-text"}`}>{value}</span>
    </div>
  );
}
