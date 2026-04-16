import { ReportDocument, SavedReportSummary, SimulationResult } from "@/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function buildReportSummary(reportId: string, simulation: SimulationResult, createdAt = simulation.generatedAt, updatedAt = createdAt, shareId?: string): SavedReportSummary {
  return {
    id: reportId,
    shareId,
    title: simulation.title || "Imported vehicle",
    verdict: simulation.verdict,
    riskLevel: simulation.risk.level,
    totalCost: simulation.breakdown.total,
    marketPrice: simulation.market.estimatedPrice,
    estimatedSpread: simulation.profitOrLoss,
    providerLabel: simulation.market.providerLabel,
    createdAt,
    updatedAt
  };
}

export function normalizeSimulationToReport(params: {
  reportId: string;
  ownerUserId: string;
  simulation: SimulationResult;
  createdAt?: string;
  updatedAt?: string;
  shareId?: string;
}): ReportDocument {
  const createdAt = params.createdAt ?? params.simulation.generatedAt;
  const updatedAt = params.updatedAt ?? createdAt;
  const summary = buildReportSummary(params.reportId, params.simulation, createdAt, updatedAt, params.shareId);

  return {
    id: params.reportId,
    ownerUserId: params.ownerUserId,
    shareId: params.shareId,
    title: summary.title,
    vehicleLabel: params.simulation.title || "Imported vehicle",
    createdAt,
    updatedAt,
    summary,
    simulation: clone(params.simulation),
    printablePath: `/reports/${params.reportId}`,
    exportPath: `/api/reports/${params.reportId}/export`,
    sharePath: params.shareId ? `/share/${params.shareId}` : undefined
  };
}

export function serializeReport(document: ReportDocument): string {
  return JSON.stringify(document);
}

export function deserializeReport(serialized: string): ReportDocument {
  return JSON.parse(serialized) as ReportDocument;
}