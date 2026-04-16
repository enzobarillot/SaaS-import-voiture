import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSimulationToReport, serializeReport, deserializeReport } from "@/lib/report";
import { runSimulation } from "@/lib/simulation";
import { providerBackedCase } from "@/tests/fixtures/scenarios";

test("report normalization produces a portable saved document", () => {
  const simulation = runSimulation(providerBackedCase, "mobile_de");
  const report = normalizeSimulationToReport({
    reportId: "report-1",
    ownerUserId: "user-1",
    simulation,
    createdAt: "2026-04-15T12:00:00.000Z",
    updatedAt: "2026-04-15T12:05:00.000Z",
    shareId: "share-123"
  });

  assert.equal(report.id, "report-1");
  assert.equal(report.ownerUserId, "user-1");
  assert.equal(report.summary.id, "report-1");
  assert.equal(report.summary.providerLabel, simulation.market.providerLabel);
  assert.equal(report.printablePath, "/reports/report-1");
  assert.equal(report.exportPath, "/api/reports/report-1/export");
  assert.equal(report.sharePath, "/share/share-123");
  assert.notEqual(report.simulation, simulation);
});

test("report serialization round-trips without dropping summary data", () => {
  const simulation = runSimulation(providerBackedCase, "mobile_de");
  const report = normalizeSimulationToReport({
    reportId: "report-2",
    ownerUserId: "user-2",
    simulation
  });

  const serialized = serializeReport(report);
  const deserialized = deserializeReport(serialized);

  assert.equal(deserialized.summary.id, report.summary.id);
  assert.equal(deserialized.summary.providerLabel, report.summary.providerLabel);
  assert.equal(deserialized.summary.totalCost, report.summary.totalCost);
  assert.equal(deserialized.summary.createdAt, report.summary.createdAt);
  assert.equal(deserialized.simulation.verdict, report.simulation.verdict);
  assert.equal(deserialized.vehicleLabel, report.vehicleLabel);
  assert.equal(deserialized.sharePath, undefined);
});