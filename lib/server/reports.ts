import { createHash, randomUUID } from "node:crypto";
import { CLOUD_HISTORY_LIMIT } from "@/lib/reference-data";
import { normalizeSimulationToReport } from "@/lib/report";
import { mutateDatabase, readDatabase, type FileDatabaseShape, type StoredReportRecord } from "@/lib/server/database";
import type { ReportDocument, SavedReportSummary, SimulationResult } from "@/types";

function fingerprintSimulation(simulation: SimulationResult): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        title: simulation.title,
        generatedAt: simulation.generatedAt,
        total: simulation.breakdown.total,
        verdict: simulation.verdict,
        provider: simulation.market.providerId
      })
    )
    .digest("hex");
}

function trimReportsForUser(userId: string, reports: StoredReportRecord[]): string[] {
  return reports
    .filter((candidate) => candidate.ownerUserId === userId)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(CLOUD_HISTORY_LIMIT)
    .map((candidate) => candidate.id);
}

function upsertReportRecord(
  database: FileDatabaseShape,
  userId: string,
  simulation: SimulationResult
): { document: ReportDocument; created: boolean } {
  const fingerprint = fingerprintSimulation(simulation);
  const now = new Date().toISOString();
  const existing = database.reports.find((candidate) => candidate.ownerUserId === userId && candidate.fingerprint === fingerprint);

  if (existing) {
    existing.updatedAt = now;
    existing.document = normalizeSimulationToReport({
      reportId: existing.id,
      ownerUserId: userId,
      simulation,
      createdAt: existing.createdAt,
      updatedAt: now,
      shareId: existing.shareId
    });

    return {
      document: existing.document,
      created: false
    };
  }

  const reportId = randomUUID();
  const document = normalizeSimulationToReport({
    reportId,
    ownerUserId: userId,
    simulation,
    createdAt: now,
    updatedAt: now
  });

  database.reports.push({
    id: reportId,
    ownerUserId: userId,
    fingerprint,
    createdAt: now,
    updatedAt: now,
    document
  });

  const overflowIds = trimReportsForUser(userId, database.reports);
  if (overflowIds.length > 0) {
    database.reports = database.reports.filter((candidate) => !overflowIds.includes(candidate.id));
  }

  return {
    document,
    created: true
  };
}

export async function countReportsForUser(userId: string): Promise<number> {
  const database = await readDatabase();
  return database.reports.filter((candidate) => candidate.ownerUserId === userId).length;
}

export async function listReportSummariesForUser(userId: string): Promise<SavedReportSummary[]> {
  const database = await readDatabase();
  return database.reports
    .filter((candidate) => candidate.ownerUserId === userId)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .map((candidate) => candidate.document.summary);
}

export async function getReportForUser(userId: string, reportId: string): Promise<ReportDocument | null> {
  const database = await readDatabase();
  const record = database.reports.find((candidate) => candidate.id === reportId && candidate.ownerUserId === userId);
  return record?.document ?? null;
}

export async function getSharedReport(shareId: string): Promise<ReportDocument | null> {
  const database = await readDatabase();
  const record = database.reports.find((candidate) => candidate.shareId === shareId);
  return record?.document ?? null;
}

export async function saveReportForUser(userId: string, simulation: SimulationResult): Promise<ReportDocument> {
  return mutateDatabase((database) => upsertReportRecord(database, userId, simulation).document);
}

export async function enableShareForReport(userId: string, reportId: string): Promise<ReportDocument | null> {
  return mutateDatabase((database) => {
    const record = database.reports.find((candidate) => candidate.id === reportId && candidate.ownerUserId === userId);
    if (!record) {
      return null;
    }

    const shareId = record.shareId ?? randomUUID().slice(0, 12);
    record.shareId = shareId;
    record.updatedAt = new Date().toISOString();
    record.document = normalizeSimulationToReport({
      reportId: record.id,
      ownerUserId: record.ownerUserId,
      simulation: record.document.simulation,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      shareId
    });

    return record.document;
  });
}

export async function importReportsForUser(userId: string, simulations: SimulationResult[]): Promise<{ imported: number; total: number }> {
  return mutateDatabase((database) => {
    let imported = 0;

    for (const simulation of simulations) {
      const outcome = upsertReportRecord(database, userId, simulation);
      if (outcome.created) {
        imported += 1;
      }
    }

    return {
      imported,
      total: database.reports.filter((candidate) => candidate.ownerUserId === userId).length
    };
  });
}