"use client";

import Link from "next/link";
import { SavedReportSummary } from "@/types";

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

export function CloudHistoryPanel({
  reports,
  onOpen
}: {
  reports: SavedReportSummary[];
  onOpen: (reportId: string) => void;
}) {
  return (
    <section className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cloud history</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">Saved reports</h2>
      </div>
      <div className="mt-5 space-y-3">
        {reports.length > 0 ? (
          reports.map((report) => (
            <div key={report.id} className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink">{report.title}</p>
                  <p className="mt-1 text-sm text-slate-500">Updated {formatDate(report.updatedAt)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">{report.verdict}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Total cost</p>
                  <p className="mt-1 font-semibold text-ink">{formatCurrency(report.totalCost)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">France market</p>
                  <p className="mt-1 font-semibold text-ink">{formatCurrency(report.marketPrice)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Gain / loss</p>
                  <p className={`mt-1 font-semibold ${report.estimatedSpread >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatCurrency(report.estimatedSpread)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Provider</p>
                  <p className="mt-1 font-semibold text-ink">{report.providerLabel}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => onOpen(report.id)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400">Open in app</button>
                <Link href={`/reports/${report.id}`} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400">Printable report</Link>
                {report.shareId ? <Link href={`/share/${report.shareId}`} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400">Shared link</Link> : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            Sign in and save a report to build your cloud history.
          </div>
        )}
      </div>
    </section>
  );
}