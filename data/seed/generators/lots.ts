import type { LotStatus } from "../../../domain/shared/enums";
import type { NewLotEvent } from "../../../domain/production/types";
import { repositories } from "../../repositories";
import type { SeededHierarchy } from "./hierarchy";
import { seedLotProductionData } from "./production-data";

/** Deliberate Phase-3 data-quality demo cases (phase-3 brief §18) — see production-data.ts for what each does. */
/**
 * Deliberate data-quality imperfections, so the quality and integrity engines have something
 * real to find in the demonstration dataset rather than reporting a uniform 100%.
 *
 * Both remaining cases surface as WARNINGs. A third override once lived here
 * (`BU-2026-006: mortalityUnderReported`), which under-reported a mortality event by 10 birds
 * and therefore raised two CRITICAL integrity issues (T17 population reconciliation, T18 data
 * quality). It was removed for the release candidate: shipping a build whose own integrity
 * screen reads "2 problèmes critiques" undermines the thing that screen exists to demonstrate.
 *
 * Nothing is lost by removing it — T17 and T18 detection is proven by dedicated tests in
 * services/integrity/checks.test.ts, which seed the defect, assert it is caught, and assert
 * the real service path does NOT produce it. That is stronger evidence than a permanently
 * corrupt row in the demo database.
 */
const QUALITY_DEMO_OVERRIDES: Record<string, Parameters<typeof seedLotProductionData>[3]> = {
  "BU-2026-003": { weightNeedsConfirmation: true },
  "BU-2026-005": { waterMissingSource: true },
};

interface LotSeed {
  code: string;
  farmName: string;
  buildingCode: string;
  species: string;
  breed: string;
  initialPopulation: number;
  status: LotStatus;
  plannedStartAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  mortality?: number;
}

const LOTS: LotSeed[] = [
  {
    code: "BU-2026-001",
    farmName: "Ferme Al Baraka",
    buildingCode: "BAT-01",
    species: "Poulet de chair",
    breed: "Ross 308",
    initialPopulation: 12000,
    status: "ACTIF",
    plannedStartAt: "2026-07-20",
    startedAt: "2026-07-21T06:00:00.000Z",
    endedAt: null,
    mortality: 80,
  },
  {
    code: "BU-2026-002",
    farmName: "Ferme Al Baraka",
    buildingCode: "BAT-02",
    species: "Poulet de chair",
    breed: "Cobb 500",
    initialPopulation: 12000,
    status: "PLANIFIE",
    plannedStartAt: "2026-09-01",
    startedAt: null,
    endedAt: null,
  },
  {
    code: "BU-2026-003",
    farmName: "Ferme Ouazzani",
    buildingCode: "BAT-01",
    species: "Poulet de chair",
    breed: "Ross 308",
    initialPopulation: 8000,
    status: "ACTIF",
    plannedStartAt: "2026-07-15",
    startedAt: "2026-07-16T06:00:00.000Z",
    endedAt: null,
    mortality: 45,
  },
  {
    code: "BU-2026-004",
    farmName: "Ferme Cherkaoui",
    buildingCode: "BAT-01",
    species: "Poulet de chair",
    breed: "Ross 308",
    initialPopulation: 10000,
    status: "CREE",
    plannedStartAt: "2026-08-25",
    startedAt: null,
    endedAt: null,
  },
  {
    code: "BU-2026-005",
    farmName: "Ferme Cherkaoui",
    buildingCode: "BAT-02",
    species: "Poulet de chair",
    breed: "Cobb 500",
    initialPopulation: 6000,
    status: "ACTIF",
    plannedStartAt: "2026-07-10",
    startedAt: "2026-07-11T06:00:00.000Z",
    endedAt: null,
    mortality: 60,
  },
  {
    code: "BU-2026-006",
    farmName: "Ferme Amrani",
    buildingCode: "BAT-01",
    species: "Poulet de chair",
    breed: "Ross 308",
    initialPopulation: 15000,
    status: "ACTIF",
    plannedStartAt: "2026-07-05",
    startedAt: "2026-07-06T06:00:00.000Z",
    endedAt: null,
    mortality: 110,
  },
  {
    code: "BU-2026-007",
    farmName: "Ferme Amrani",
    buildingCode: "BAT-02",
    species: "Poulet de chair",
    breed: "Cobb 500",
    initialPopulation: 9000,
    status: "SUSPENDU",
    plannedStartAt: "2026-06-20",
    startedAt: "2026-06-21T06:00:00.000Z",
    endedAt: null,
    mortality: 200,
  },
  {
    code: "BU-2026-008",
    farmName: "Ferme Amrani — Extension",
    buildingCode: "BAT-01",
    species: "Poulet de chair",
    breed: "Ross 308",
    initialPopulation: 7000,
    status: "PLANIFIE",
    plannedStartAt: "2026-09-10",
    startedAt: null,
    endedAt: null,
  },
  {
    code: "BU-2026-009",
    farmName: "Ferme Fassi",
    buildingCode: "BAT-01",
    species: "Poulet de chair",
    breed: "Ross 308",
    initialPopulation: 9000,
    status: "ACTIF",
    plannedStartAt: "2026-07-18",
    startedAt: "2026-07-19T06:00:00.000Z",
    endedAt: null,
    mortality: 55,
  },
  {
    code: "BU-2025-010",
    farmName: "Ferme Tazi",
    buildingCode: "BAT-01",
    species: "Poulet de chair",
    breed: "Ross 308",
    initialPopulation: 11000,
    status: "CLOTURE",
    plannedStartAt: "2025-12-01",
    startedAt: "2025-12-02T06:00:00.000Z",
    endedAt: "2026-01-15T06:00:00.000Z",
    mortality: 320,
  },
  {
    code: "BU-2026-011",
    farmName: "Ferme Tazi",
    buildingCode: "BAT-02",
    species: "Poulet de chair",
    breed: "Cobb 500",
    initialPopulation: 11000,
    status: "ACTIF",
    plannedStartAt: "2026-07-22",
    startedAt: "2026-07-23T06:00:00.000Z",
    endedAt: null,
    mortality: 70,
  },
  {
    code: "BU-2026-012",
    farmName: "Ferme El Amrani",
    buildingCode: "BAT-01",
    species: "Poulet de chair",
    breed: "Ross 308",
    initialPopulation: 8500,
    status: "CREE",
    plannedStartAt: "2026-08-28",
    startedAt: null,
    endedAt: null,
  },
];

export async function seedLots(hierarchy: SeededHierarchy): Promise<{ heroLotId: string }> {
  let heroLotId = "";

  for (const lotSeed of LOTS) {
    const farm = hierarchy.farmsByKey.get(lotSeed.farmName);
    const buildingId = farm?.buildingIds.get(lotSeed.buildingCode);
    if (!farm || !buildingId) {
      throw new Error(`Seed error: unknown farm/building "${lotSeed.farmName}" / "${lotSeed.buildingCode}"`);
    }

    const currentPopulation = lotSeed.initialPopulation - (lotSeed.mortality ?? 0);

    const lot = await repositories.lots.create({
      buildingId,
      code: lotSeed.code,
      species: lotSeed.species,
      breed: lotSeed.breed,
      status: lotSeed.status,
      initialPopulation: lotSeed.initialPopulation,
      currentPopulation,
      plannedStartAt: lotSeed.plannedStartAt,
      startedAt: lotSeed.startedAt,
      endedAt: lotSeed.endedAt,
      dataStatus: "SIMULATION",
    });

    if (lotSeed.code === "BU-2026-001") heroLotId = lot.id;

    const events: NewLotEvent[] = [
      {
        lotId: lot.id,
        eventType: "CREATION_LOT",
        payload: { initialPopulation: lot.initialPopulation },
        occurredAt: lot.createdAt,
        actorId: null,
        dataStatus: "SIMULATION",
        sourceType: "SIMULATEUR",
        sourceId: null,
        deviceId: null,
        measurementMethod: null,
        validationStatus: null,
      },
    ];

    if (lotSeed.startedAt) {
      events.push({
        lotId: lot.id,
        eventType: "MISE_EN_PLACE",
        payload: { notes: `Mise en place de ${lotSeed.initialPopulation.toLocaleString("fr-FR")} sujets.` },
        occurredAt: lotSeed.startedAt,
        actorId: null,
        dataStatus: "SIMULATION",
        sourceType: "SIMULATEUR",
        sourceId: null,
        deviceId: null,
        measurementMethod: null,
        validationStatus: null,
      });
    }

    const mortalityEventSeeds: { count: number; occurredAt: string; cause: string }[] = [];
    if (lotSeed.mortality && lotSeed.startedAt) {
      const half = Math.floor(lotSeed.mortality / 2);
      const startDate = new Date(lotSeed.startedAt);
      const firstMortalityAt = new Date(startDate.getTime() + 5 * 86400000).toISOString();
      const secondMortalityAt = new Date(startDate.getTime() + 12 * 86400000).toISOString();
      mortalityEventSeeds.push(
        { count: half, occurredAt: firstMortalityAt, cause: "Mortalité naturelle" },
        { count: lotSeed.mortality - half, occurredAt: secondMortalityAt, cause: "Mortalité naturelle" }
      );
      events.push(
        {
          lotId: lot.id,
          eventType: "MORTALITE",
          payload: { quantity: half, cause: "Mortalité naturelle" },
          occurredAt: firstMortalityAt,
          actorId: null,
          dataStatus: "SIMULATION",
          sourceType: "SIMULATEUR",
          sourceId: null,
          deviceId: null,
          measurementMethod: null,
          validationStatus: null,
        },
        {
          lotId: lot.id,
          eventType: "MORTALITE",
          payload: { quantity: lotSeed.mortality - half, cause: "Mortalité naturelle" },
          occurredAt: secondMortalityAt,
          actorId: null,
          dataStatus: "SIMULATION",
          sourceType: "SIMULATEUR",
          sourceId: null,
          deviceId: null,
          measurementMethod: null,
          validationStatus: null,
        }
      );
    }

    if (lotSeed.code === "BU-2026-001" && lotSeed.startedAt) {
      const startDate = new Date(lotSeed.startedAt);
      events.push(
        {
          lotId: lot.id,
          eventType: "PESEE",
          payload: { averageWeightKg: 1.85, sampleSize: 50 },
          occurredAt: new Date(startDate.getTime() + 18 * 86400000).toISOString(),
          actorId: null,
          dataStatus: "SIMULATION",
          sourceType: "SIMULATEUR",
          sourceId: null,
          deviceId: null,
          measurementMethod: "Pesée manuelle — échantillon",
          validationStatus: null,
        },
        {
          lotId: lot.id,
          eventType: "ALIMENTATION",
          payload: { quantityKg: 2400, feedType: "Croissance" },
          occurredAt: new Date(startDate.getTime() + 20 * 86400000).toISOString(),
          actorId: null,
          dataStatus: "SIMULATION",
          sourceType: "SIMULATEUR",
          sourceId: null,
          deviceId: null,
          measurementMethod: null,
          validationStatus: null,
        }
      );
    }

    for (const event of events) {
      await repositories.lotEvents.create(event);
    }

    await seedLotProductionData(lot, buildingId, mortalityEventSeeds, QUALITY_DEMO_OVERRIDES[lotSeed.code] ?? {});
  }

  return { heroLotId };
}
