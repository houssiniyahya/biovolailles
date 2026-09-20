import { repositories } from "../../data/repositories";
import type { ProvenanceSummary } from "../../domain/shared/provenance";
import { describeProvenance } from "../provenance/provenance-service";
import type { ChainNode } from "./entity-resolver";

export interface NodeDetailField {
  label: string;
  value: string;
}

export interface NodeDetail {
  fields: NodeDetailField[];
  provenance: ProvenanceSummary | null;
}

const EMPTY: NodeDetail = { fields: [], provenance: null };

function fmt(value: string): string {
  return new Date(value).toLocaleString("fr-FR");
}

/** Full field list + provenance for one non-Lot node — the traceability page's per-node detail card (phase-7 brief §11's "click a node to open its detail"). One fetch per node, reused for both. */
export async function getNodeDetail(node: ChainNode): Promise<NodeDetail> {
  switch (node.type) {
    case "COLLECTION": {
      const record = await repositories.collections.findById(node.id);
      if (!record) return EMPTY;
      const destination = record.destinationId ? await repositories.destinations.findById(record.destinationId) : null;
      return {
        fields: [
          { label: "Quantité", value: `${record.quantity} ${record.unit}` },
          { label: "Date de collecte", value: fmt(record.collectedAt) },
          { label: "Destination", value: destination?.name ?? "—" },
        ],
        provenance: await describeProvenance(record, { occurredAt: record.collectedAt, lotId: record.lotId }),
      };
    }
    case "SLAUGHTER_BATCH": {
      const record = await repositories.slaughterBatches.findById(node.id);
      if (!record) return EMPTY;
      return {
        fields: [
          { label: "Quantité entrante", value: `${record.quantityIn} kg` },
          { label: "Quantité sortante", value: `${record.quantityOut} kg` },
          { label: "Pertes", value: `${record.losses} kg` },
          { label: "Date d'abattage", value: fmt(record.slaughteredAt) },
        ],
        provenance: await describeProvenance(record, { occurredAt: record.slaughteredAt, lotId: record.sourceLotId }),
      };
    }
    case "TRANSFORMATION_BATCH": {
      const record = await repositories.transformationBatches.findById(node.id);
      if (!record) return EMPTY;
      return {
        fields: [
          { label: "Procédé", value: record.processType },
          { label: "Quantité entrante", value: `${record.inputQuantity} kg` },
          { label: "Quantité sortante", value: `${record.outputQuantity} kg` },
          { label: "Pertes", value: `${record.losses} kg` },
          { label: "Rejets", value: `${record.rejects} kg` },
          { label: "Date", value: fmt(record.occurredAt) },
        ],
        provenance: await describeProvenance(record, { occurredAt: record.occurredAt }),
      };
    }
    case "PRODUCT": {
      const record = await repositories.products.findById(node.id);
      if (!record) return EMPTY;
      return {
        fields: [
          { label: "Nom", value: record.name },
          { label: "Catégorie", value: record.category },
          { label: "Date de conditionnement", value: fmt(record.packagingDate) },
          { label: "Date d'expiration", value: record.expiryDate ? fmt(record.expiryDate) : "—" },
        ],
        provenance: await describeProvenance(record, { occurredAt: record.packagingDate }),
      };
    }
    case "DESTINATION": {
      const record = await repositories.destinations.findById(node.id);
      if (!record) return EMPTY;
      return {
        fields: [
          { label: "Type", value: record.type },
          { label: "Ville", value: record.city },
        ],
        provenance: null,
      };
    }
    default:
      return EMPTY;
  }
}
