import type { AlertSeverity, AlertStatus, AnomalyStatus, DataStatus, DeviceStatus, LotStatus } from "@/domain/shared/enums";
import type { Confidence } from "@/domain/intelligence/types";
import type { KpiEligibility } from "@/domain/intelligence/kpi-eligibility";

export type BadgeTone = "neutral" | "success" | "warning" | "critical" | "info" | "gold";

/**
 * Central status -> color mapping (ARCHITECTURE.md §11) — a status never gets an
 * ad-hoc color chosen per screen. SIMULATION intentionally gets its own accent (gold)
 * rather than a generic warning tone, so demo data reads as "not real", not "a problem".
 */
export const DATA_STATUS_TONE: Record<DataStatus, BadgeTone> = {
  REEL: "info",
  TEST: "neutral",
  SIMULATION: "gold",
  CALCULE: "info",
  ESTIME: "warning",
  A_CONFIRMER: "warning",
  VALIDE: "success",
  MANQUANT: "critical",
};

export const DATA_STATUS_LABEL: Record<DataStatus, string> = {
  REEL: "Réel",
  TEST: "Test",
  SIMULATION: "Simulation",
  CALCULE: "Calculé",
  ESTIME: "Estimé",
  A_CONFIRMER: "À confirmer",
  VALIDE: "Validé",
  MANQUANT: "Manquant",
};

export const LOT_STATUS_TONE: Record<LotStatus, BadgeTone> = {
  PLANIFIE: "neutral",
  CREE: "info",
  ACTIF: "success",
  EN_TRANSFERT: "info",
  SUSPENDU: "warning",
  BLOQUE: "critical",
  LIBERE: "success",
  ABATTU: "neutral",
  TRANSFORME: "neutral",
  CLOTURE: "neutral",
  ARCHIVE: "neutral",
};

export const LOT_STATUS_LABEL: Record<LotStatus, string> = {
  PLANIFIE: "Planifié",
  CREE: "Créé",
  ACTIF: "Actif",
  EN_TRANSFERT: "En transfert",
  SUSPENDU: "Suspendu",
  BLOQUE: "Bloqué",
  LIBERE: "Libéré",
  ABATTU: "Abattu",
  TRANSFORME: "Transformé",
  CLOTURE: "Clôturé",
  ARCHIVE: "Archivé",
};

export const ALERT_SEVERITY_TONE: Record<AlertSeverity, BadgeTone> = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical",
};

export const ALERT_SEVERITY_LABEL: Record<AlertSeverity, string> = {
  INFO: "Info",
  WARNING: "Avertissement",
  CRITICAL: "Critique",
};

export const ALERT_STATUS_TONE: Record<AlertStatus, BadgeTone> = {
  OPEN: "critical",
  ACKNOWLEDGED: "warning",
  RESOLVED: "success",
  DISMISSED: "neutral",
};

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  OPEN: "Ouverte",
  ACKNOWLEDGED: "Prise en compte",
  RESOLVED: "Résolue",
  DISMISSED: "Écartée",
};

export const ANOMALY_STATUS_LABEL: Record<AnomalyStatus, string> = {
  OPEN: "Ouverte",
  REVIEWED: "Traitée",
  DISMISSED: "Écartée",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  HIGH: "Confiance élevée",
  MEDIUM: "Confiance moyenne",
  LOW: "Confiance faible",
};

export const CONFIDENCE_TONE: Record<Confidence, BadgeTone> = {
  HIGH: "success",
  MEDIUM: "info",
  LOW: "neutral",
};

export const KPI_ELIGIBILITY_LABEL: Record<KpiEligibility, string> = {
  AVAILABLE: "Donnée disponible",
  LIMITED: "Qualité limitée",
  INSUFFICIENT: "Donnée insuffisante",
};

export const KPI_ELIGIBILITY_TONE: Record<KpiEligibility, BadgeTone> = {
  AVAILABLE: "success",
  LIMITED: "warning",
  INSUFFICIENT: "critical",
};

/** Device/sensor health. Centralised for the same reason as DEVICE_STATUS_LABEL. */
export const DEVICE_STATUS_TONE: Record<DeviceStatus, BadgeTone> = {
  ONLINE: "success",
  OFFLINE: "neutral",
  FAULT: "critical",
};
