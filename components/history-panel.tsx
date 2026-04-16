import type { DealVerdict, SimulationResult } from "@/types";

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

function formatCurrency(value: number): string {
  return currency.format(value || 0);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function verdictBadge(verdict: DealVerdict): string {
  if (verdict === "GOOD DEAL") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (verdict === "FAIR DEAL") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-rose-100 text-rose-900 border-rose-200";
}

export function HistoryPanel({
  history,
  onSelect,
  onClear
}: {
  history: SimulationResult[];
  onSelect: (result: SimulationResult) => void;
  onClear: () => void;
}) {
  return (
    <section id="history" className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">History</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Recent decisions</h2>
        </div>
        {history.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {history.length > 0 ? (
          history.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry)}
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-orange-300 hover:bg-orange-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink">{entry.title || "Imported vehicle"}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatDate(entry.generatedAt)}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${verdictBadge(entry.verdict)}`}>{entry.verdict}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Total cost</p>
                  <p className="mt-1 font-semibold text-ink">{formatCurrency(entry.breakdown.total)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">France market</p>
                  <p className="mt-1 font-semibold text-ink">{formatCurrency(entry.market.estimatedPrice)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Gain / loss</p>
                  <p className={`mt-1 font-semibold ${entry.profitOrLoss >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatCurrency(entry.profitOrLoss)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Risk</p>
                  <p className="mt-1 font-semibold text-ink">{entry.risk.level}</p>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            Local decision history will appear here after the first simulation.
          </div>
        )}
      </div>
    </section>
  );
}

