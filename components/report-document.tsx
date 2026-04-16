"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import type { ReportDocument } from "@/types";

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

export function ReportDocumentView({ report, shared = false }: { report: ReportDocument; shared?: boolean }) {
  const simulation = report.simulation;

  useEffect(() => {
    void trackEvent(ANALYTICS_EVENTS.printableReportViewed, {
      reportId: report.id,
      shared,
      verdict: simulation.verdict
    });
  }, [report.id, shared, simulation.verdict]);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900 md:px-10 lg:px-16 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft print:rounded-none print:border-none print:shadow-none md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">ImportScore report</p>
              <h1 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">{report.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Saved {formatDate(report.createdAt)}. {shared ? "Shared link view." : "Printable owner view."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 print:hidden">
              {!shared ? (
                <Link href={report.exportPath} onClick={() => void trackEvent(ANALYTICS_EVENTS.exportActionUsed, { reportId: report.id, source: "report_route" })} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Export JSON
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => globalThis.print?.()}
                className="rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
              >
                Print report
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total import cost</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{formatCurrency(simulation.breakdown.total)}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">France market</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{formatCurrency(simulation.market.estimatedPrice)}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Gain / loss</p>
              <p className={`mt-3 text-2xl font-semibold ${simulation.profitOrLoss >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {formatCurrency(simulation.profitOrLoss)}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Verdict</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{simulation.verdict}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] print:grid-cols-1">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft print:shadow-none">
              <h2 className="text-lg font-semibold text-ink">Vehicle summary</h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                <p><span className="font-semibold text-ink">Vehicle:</span> {simulation.title}</p>
                <p><span className="font-semibold text-ink">Origin:</span> {simulation.input.countryOfOrigin}</p>
                <p><span className="font-semibold text-ink">First registration:</span> {simulation.input.firstRegistrationDate || "Not provided"}</p>
                <p><span className="font-semibold text-ink">Mileage:</span> {simulation.input.mileage.toLocaleString("fr-FR")} km</p>
                <p><span className="font-semibold text-ink">Fuel:</span> {simulation.input.fuelType}</p>
                <p><span className="font-semibold text-ink">Transmission:</span> {simulation.input.transmission}</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft print:shadow-none">
              <h2 className="text-lg font-semibold text-ink">Cost breakdown</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {simulation.breakdown.lines.map((line) => (
                  <div key={line.key} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-medium text-ink">{line.label}</p>
                      {line.note ? <p className="mt-1 text-xs text-slate-500">{line.note}</p> : null}
                    </div>
                    <span className="font-semibold text-slate-900">{formatCurrency(line.amount)}</span>
                  </div>
                ))}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="font-medium text-ink">VAT</p>
                    <p className="mt-1 text-xs text-slate-500">{simulation.breakdown.vat.reason}</p>
                    <p className="mt-3 font-semibold text-slate-900">{formatCurrency(simulation.breakdown.vat.amount)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="font-medium text-ink">Registration</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {simulation.breakdown.registration.fiscalPowerUsed} CV x {simulation.breakdown.registration.fiscalRateUsed} EUR
                    </p>
                    <p className="mt-3 font-semibold text-slate-900">{formatCurrency(simulation.breakdown.registration.amount)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="font-medium text-ink">Malus</p>
                    <p className="mt-1 text-xs text-slate-500">{simulation.breakdown.malus.referenceLabel}</p>
                    <p className="mt-3 font-semibold text-slate-900">{formatCurrency(simulation.breakdown.malus.total)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft print:shadow-none">
              <h2 className="text-lg font-semibold text-ink">Assumptions and checklist</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {simulation.warnings.map((warning) => (
                  <p key={warning} className="rounded-2xl bg-amber-50 px-4 py-3 text-amber-900">{warning}</p>
                ))}
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                {simulation.checklist.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="font-medium text-ink">{item.label}</p>
                    <p className="mt-1">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft print:shadow-none">
              <h2 className="text-lg font-semibold text-ink">Market comparison</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p className="rounded-2xl bg-slate-50 px-4 py-3"><span className="font-semibold text-ink">Source:</span> {simulation.market.providerLabel}</p>
                <p className="rounded-2xl bg-slate-50 px-4 py-3"><span className="font-semibold text-ink">Confidence:</span> {simulation.comparison.confidenceLabel}</p>
                <p className="rounded-2xl bg-slate-50 px-4 py-3"><span className="font-semibold text-ink">Explanation:</span> {simulation.market.explanation}</p>
                <p className="rounded-2xl bg-slate-50 px-4 py-3"><span className="font-semibold text-ink">Spread:</span> {simulation.comparison.spreadLabel}</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft print:shadow-none">
              <h2 className="text-lg font-semibold text-ink">Why this verdict?</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {simulation.narrative.whyVerdict.map((reason) => (
                  <p key={reason} className="rounded-2xl bg-slate-50 px-4 py-3">{reason}</p>
                ))}
              </div>
            </div>

            {simulation.market.comparableListings?.length ? (
              <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft print:shadow-none">
                <h2 className="text-lg font-semibold text-ink">Comparable references</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  {simulation.market.comparableListings.map((listing) => (
                    <div key={listing.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="font-medium text-ink">{listing.title}</p>
                      <p className="mt-1">
                        {formatCurrency(listing.price)} - {listing.year} - {listing.mileage.toLocaleString("fr-FR")} km
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{listing.sourceLabel}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}