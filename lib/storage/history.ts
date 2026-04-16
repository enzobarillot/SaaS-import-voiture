import { HISTORY_STORAGE_KEY } from "@/lib/reference-data";
import { SimulationResult } from "@/types";

export function loadHistory(): SimulationResult[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SimulationResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistHistory(history: SimulationResult[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 12)));
}

export function pushHistory(result: SimulationResult): SimulationResult[] {
  const nextHistory = [result, ...loadHistory().filter((item) => item.id !== result.id)].slice(0, 12);
  persistHistory(nextHistory);
  return nextHistory;
}

export function clearHistory(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
}
