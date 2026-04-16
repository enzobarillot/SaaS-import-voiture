import { FREE_SIMULATION_LIMIT, USAGE_STORAGE_KEY } from "@/lib/reference-data";
import { UsageState } from "@/types";

interface UsageRecord {
  periodKey: string;
  used: number;
}

function getPeriodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getPeriodLabel(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function readUsageRecord(now = new Date()): UsageRecord {
  const fallback: UsageRecord = {
    periodKey: getPeriodKey(now),
    used: 0
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as UsageRecord;
    if (!parsed || typeof parsed.used !== "number" || typeof parsed.periodKey !== "string") {
      return fallback;
    }

    if (parsed.periodKey !== fallback.periodKey) {
      return fallback;
    }

    return parsed;
  } catch {
    return fallback;
  }
}

function persistUsageRecord(record: UsageRecord): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(record));
}

function toUsageState(record: UsageRecord, now = new Date()): UsageState {
  const remaining = Math.max(0, FREE_SIMULATION_LIMIT - record.used);
  return {
    plan: "free",
    used: record.used,
    remaining,
    limit: FREE_SIMULATION_LIMIT,
    locked: remaining <= 0,
    periodLabel: getPeriodLabel(now),
    upgradeMessage: "Premium will unlock unlimited decisions, richer history, export, and stronger comparison coverage."
  };
}

export function getUsageState(now = new Date()): UsageState {
  return toUsageState(readUsageRecord(now), now);
}

export function consumeSimulationCredit(now = new Date()): UsageState {
  const record = readUsageRecord(now);
  const nextRecord: UsageRecord = {
    periodKey: getPeriodKey(now),
    used: Math.min(FREE_SIMULATION_LIMIT, record.used + 1)
  };
  persistUsageRecord(nextRecord);
  return toUsageState(nextRecord, now);
}

