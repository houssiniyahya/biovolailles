"use client";

import { ExternalLink, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import type { QrScope } from "@/domain/traceability/types";
import { createLotQrTokenAction, createProductQrTokenAction, revokeQrTokenAction } from "../actions";

export interface PassportTokenView {
  id: string;
  scope: QrScope;
  label: string;
  publicUrl: string;
  qrDataUrl: string;
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
}

export interface PassportTabData {
  tokens: PassportTokenView[];
  /** Products discovered in this lot's own traceability chain — the only ones a product QR may be minted for. */
  products: { id: string; code: string; name: string }[];
  canManage: boolean;
}

export function PassportTab({ lotId, data }: { lotId: string; data: PassportTabData }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState(data.products[0]?.id ?? "");

  async function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      setError(result.error?.message ?? "Opération impossible.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {data.canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Générer un passeport public</CardTitle>
            <CardDescription>
              Chaque passeport publie un lien public anonyme. Aucun identifiant interne n&apos;est exposé.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" disabled={pending} onClick={() => run(() => createLotQrTokenAction(lotId))}>
                <QrCode className="size-4" aria-hidden="true" />
                Passeport du lot
              </Button>
            </div>
            {data.products.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  aria-label="Produit"
                  className="h-8 w-64 text-xs"
                >
                  {data.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending || !productId}
                  onClick={() => run(() => createProductQrTokenAction(productId, lotId))}
                >
                  <QrCode className="size-4" aria-hidden="true" />
                  Passeport produit
                </Button>
              </div>
            ) : (
              <p className="border-t border-border pt-3 text-xs text-secondary">
                Aucun produit en aval pour ce lot — seul un passeport de lot est possible.
              </p>
            )}
            {error ? <p className="text-xs text-critical-strong">{error}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {data.tokens.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="Aucun passeport public"
          description="Aucun QR code n'a encore été généré pour ce lot."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.tokens.map((token) => (
            <Card key={token.id} className="flex flex-col gap-4 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URI generated server-side; next/image would proxy a base64 string for no benefit */}
              <img
                src={token.qrDataUrl}
                alt={`QR code du passeport ${token.label}`}
                width={128}
                height={128}
                className={`size-32 shrink-0 self-center rounded-md border border-border ${token.active ? "" : "opacity-30 grayscale"}`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-text">{token.label}</span>
                  <Badge tone={token.scope === "PRODUCT" ? "info" : "neutral"}>
                    {token.scope === "PRODUCT" ? "Produit" : "Lot"}
                  </Badge>
                  <Badge tone={token.active ? "success" : "critical"}>{token.active ? "Actif" : "Révoqué"}</Badge>
                </div>
                <a
                  href={token.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring flex items-center gap-1 truncate font-mono text-xs text-bio-green hover:underline"
                >
                  <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                  {token.publicUrl}
                </a>
                <p className="text-xs text-secondary">
                  Créé le {new Date(token.createdAt).toLocaleString("fr-FR")}
                  {token.expiresAt ? ` · Expire le ${new Date(token.expiresAt).toLocaleDateString("fr-FR")}` : ""}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <Button asChild size="sm" variant="secondary">
                    <a href={token.qrDataUrl} download={`qr-${token.label.replace(/\s+/g, "-").toLowerCase()}.png`}>
                      Télécharger le QR
                    </a>
                  </Button>
                  {data.canManage && token.active ? (
                    <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => revokeQrTokenAction(token.id, lotId))}>
                      Révoquer
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
