import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/domain/PageHeader";
import { TraceabilityGraph } from "@/components/domain/TraceabilityGraph";
import { TraceabilityIntegrityPanel } from "@/components/domain/TraceabilityIntegrityPanel";
import { TraceabilityNodeDetailCard } from "@/components/domain/TraceabilityNodeDetailCard";
import { TraceabilityTimeline } from "@/components/domain/TraceabilityTimeline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { repositories } from "@/data/repositories";
import { AuthorizationError, NotFoundError } from "@/domain/shared/errors";
import { LOT_STATUS_LABEL } from "@/lib/status-colors";
import { requireModuleAccess } from "@/services/auth/guard";
import { buildLotTraceabilityChain } from "@/services/traceability/chain";
import { checkTraceabilityIntegrity } from "@/services/traceability/integrity";
import { getNodeDetail } from "@/services/traceability/node-detail";

export default async function LotTraceabilityPage({ params }: PageProps<"/lots/[lotId]/tracabilite">) {
  const session = await requireModuleAccess("TRACEABILITY");
  const { lotId } = await params;

  let chain: Awaited<ReturnType<typeof buildLotTraceabilityChain>>;
  try {
    chain = await buildLotTraceabilityChain(lotId, session);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof AuthorizationError) redirect("/non-autorise");
    throw error;
  }

  const lot = await repositories.lots.findById(lotId);
  if (!lot) notFound();

  const [issues, details] = await Promise.all([
    checkTraceabilityIntegrity(chain, lot),
    Promise.all(
      chain.nodes
        .filter((node) => node.type !== "LOT")
        .map(async (node) => ({ node, detail: await getNodeDetail(node) }))
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Lots", href: "/lots" }, { label: lot.code, href: `/lots/${lot.id}` }, { label: "Traçabilité" }]}
        title={`Traçabilité — ${lot.code}`}
        description={`Statut du lot : ${LOT_STATUS_LABEL[lot.status]}`}
        actions={
          <Link href={`/lots/${lot.id}`} className="focus-ring text-sm font-medium text-bio-green hover:underline">
            ← Retour au lot
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Origine</CardTitle>
            <CardDescription>Hiérarchie structurelle existante — aucune donnée inventée.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {chain.upstream.length === 0 ? (
              <p className="text-xs text-secondary">Aucune origine structurelle disponible.</p>
            ) : (
              chain.upstream.map((link) => (
                <div key={link.label} className="flex items-center justify-between">
                  <span className="text-secondary">{link.label}</span>
                  {link.href ? (
                    <Link href={link.href} className="focus-ring font-medium text-bio-green hover:underline">
                      {link.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-text">{link.name}</span>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>État de vérification</CardTitle>
            <CardDescription>Contrôles automatiques de cohérence sur la chaîne de ce lot.</CardDescription>
          </CardHeader>
          <CardContent>
            <TraceabilityIntegrityPanel issues={issues} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chaîne de lignage</CardTitle>
            <CardDescription>Comment ces objets sont reliés — cliquez un maillon pour son détail.</CardDescription>
          </CardHeader>
          <CardContent>
            <TraceabilityGraph nodes={chain.nodes} edges={chain.edges} currentNodeId={lot.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chronologie</CardTitle>
            <CardDescription>Ce qui s&apos;est passé, et quand.</CardDescription>
          </CardHeader>
          <CardContent>
            <TraceabilityTimeline entries={chain.timeline} />
          </CardContent>
        </Card>
      </div>

      {details.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-text">Détail des maillons</h2>
          {details.map(({ node, detail }) => (
            <TraceabilityNodeDetailCard key={`${node.type}-${node.id}`} node={node} detail={detail} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
