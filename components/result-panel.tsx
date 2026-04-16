import type { ReactNode } from "react";
import Link from "next/link";
import { FeedbackWidget } from "@/components/feedback-widget";
import { LeadCaptureForm } from "@/components/lead-capture-form";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { PREMIUM_FEATURES } from "@/lib/reference-data";
import type { DealVerdict, ProductAccess, ReportDocument, RiskLevel, SimulationResult } from "@/types";

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

function formatCurrency(value: number): string {
  return currency.format(value || 0);
}

function verdictTone(verdict: DealVerdict): string {
  if (verdict === "GOOD DEAL") return "bg-emerald-100 text-emerald-900";
  if (verdict === "FAIR DEAL") return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-900";
}

function riskTone(level: RiskLevel): string {
  if (level === "LOW") return "text-emerald-300";
  if (level === "MEDIUM") return "text-amber-300";
  return "text-rose-300";
}

function formatObservedAt(value?: string): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("fr-FR", { dateStyle: "medium" });
}

function Disclosure({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-[1.5rem] border border-slate-200 bg-white p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink">
        {title}
        <span className="text-slate-400 transition group-open:rotate-45">+</span>
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}

export function ResultPanel({
  result,
  access,
  savedReport,
  cloudBusy,
  cloudMessage,
  onSaveSnapshot,
  onSaveCloud,
  onCreateShare
}: {
  result: SimulationResult | null;
  access: ProductAccess;
  savedReport: ReportDocument | null;
  cloudBusy: boolean;
  cloudMessage?: string;
  onSaveSnapshot: () => void;
  onSaveCloud: () => void;
  onCreateShare: () => void;
}) {
  if (!result) {
    return (
      <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 shadow-soft">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Decision</p>
        <h2 className="mt-3 text-3xl font-semibold text-ink">Your verdict appears here.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Paste a listing or load a sample. The result will prioritize total cost, verdict, gain/loss, and risk.</p>
      </section>
    );
  }

  const observedAt = formatObservedAt(result.market.provenance.observedAt);
  const spreadLabel = result.comparison.direction === "overpay" ? "Estimated overpay" : result.comparison.direction === "break_even" ? "Estimated gap" : "Estimated savings";

  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] bg-ink p-6 text-white shadow-soft md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Decision</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-5xl">{formatCurrency(result.breakdown.total)}</h2>
            <p className="mt-2 text-sm text-slate-300">Total import cost into France</p>
          </div>
          <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${verdictTone(result.verdict)}`}>{result.verdict}</span>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{spreadLabel}</p>
            <p className={`mt-2 text-3xl font-semibold ${result.profitOrLoss >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatCurrency(result.profitOrLoss)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Risk</p>
            <p className={`mt-2 text-3xl font-semibold ${riskTone(result.risk.level)}`}>{result.risk.level}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">France market</p>
            <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(result.market.estimatedPrice)}</p>
          </div>
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-7 text-slate-200">{result.narrative.verdictReason}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Market source</p>
          <p className="mt-2 text-xl font-semibold text-ink">{result.market.providerLabel}</p>
          <p className="mt-2 text-sm text-slate-600">{result.comparison.confidenceLabel}. {observedAt ? `Observed ${observedAt}.` : result.market.provenance.freshness.replace("_", " ")}.</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Next action</p>
          <p className="mt-2 text-xl font-semibold text-ink">Save or verify details</p>
          <p className="mt-2 text-sm text-slate-600">Use the breakdown only when the headline verdict is worth pursuing.</p>
        </div>
      </div>

      <Disclosure title="Cost breakdown" defaultOpen>
        <div className="space-y-2 text-sm text-slate-600">
          {result.breakdown.lines.map((line) => (
            <div key={line.key} className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
              <div>
                <p className="font-medium text-ink">{line.label}</p>
                {line.note ? <p className="mt-1 text-xs text-slate-500">{line.note}</p> : null}
              </div>
              <span className="font-semibold text-slate-900">{formatCurrency(line.amount)}</span>
            </div>
          ))}
          <div className="grid gap-3 pt-4 md:grid-cols-3">
            <p className="rounded-2xl bg-slate-50 p-4"><span className="block font-medium text-ink">VAT</span><span className="mt-1 block text-xs">{result.breakdown.vat.reason}</span><span className="mt-3 block font-semibold text-slate-900">{formatCurrency(result.breakdown.vat.amount)}</span></p>
            <p className="rounded-2xl bg-slate-50 p-4"><span className="block font-medium text-ink">Registration</span><span className="mt-1 block text-xs">{result.breakdown.registration.fiscalPowerUsed} CV x {result.breakdown.registration.fiscalRateUsed} EUR</span><span className="mt-3 block font-semibold text-slate-900">{formatCurrency(result.breakdown.registration.amount)}</span></p>
            <p className="rounded-2xl bg-slate-50 p-4"><span className="block font-medium text-ink">Malus</span><span className="mt-1 block text-xs">{result.breakdown.malus.referenceLabel}</span><span className="mt-3 block font-semibold text-slate-900">{formatCurrency(result.breakdown.malus.total)}</span></p>
          </div>
        </div>
      </Disclosure>

      <Disclosure title="Market comparison">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-ink">{result.market.provenance.sourceLabel}</p>
            <p className="mt-2">{result.market.provenance.connectorLabel}. {result.market.provenance.note ?? result.market.explanation}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-ink">Spread</p>
            <p className="mt-2">{result.comparison.spreadLabel}</p>
          </div>
        </div>
        {result.market.comparableListings?.length ? (
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {result.market.comparableListings.map((listing) => (
              <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div><p className="font-medium text-ink">{listing.title}</p><p className="text-xs text-slate-500">{listing.sourceLabel}</p></div>
                <p>{formatCurrency(listing.price)} - {listing.year} - {listing.mileage.toLocaleString("fr-FR")} km</p>
              </div>
            ))}
          </div>
        ) : null}
      </Disclosure>

      <Disclosure title="Checklist and assumptions">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-600">
            {result.checklist.map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ink">{item.label}</p>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.urgency}</span>
                </div>
                <p className="mt-1">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            {(result.warnings.length > 0 ? result.warnings : result.risk.reasons).map((warning) => (
              <p key={warning} className="rounded-2xl bg-amber-50 px-4 py-3 text-amber-900">{warning}</p>
            ))}
          </div>
        </div>
      </Disclosure>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Report actions</p>
            <p className="mt-1 text-sm text-slate-600">Save, share, print, or export when this decision is worth keeping.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onSaveSnapshot} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Save locally</button>
            <button type="button" onClick={onSaveCloud} disabled={cloudBusy} className="rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">{cloudBusy ? "Saving..." : access.canSaveCloud ? "Save cloud" : "Sign in"}</button>
            {savedReport ? <button type="button" onClick={onCreateShare} disabled={cloudBusy} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">{savedReport.shareId ? "Refresh link" : "Share"}</button> : null}
          </div>
        </div>
        {savedReport ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={savedReport.printablePath} className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">Printable</Link>
            <Link href={savedReport.exportPath} onClick={() => void trackEvent(ANALYTICS_EVENTS.exportActionUsed, { reportId: savedReport.id, source: "result_panel" })} className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">Export JSON</Link>
            {savedReport.sharePath ? <Link href={savedReport.sharePath} className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">Open shared</Link> : null}
          </div>
        ) : null}
        {cloudMessage ? <p className="mt-3 text-sm text-slate-600">{cloudMessage}</p> : null}
      </div>

      <Disclosure title="Premium and feedback">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-ink p-5 text-sm text-slate-200">
            <p className="font-semibold text-white">Premium interest</p>
            <div className="mt-3 space-y-2">{PREMIUM_FEATURES.map((feature) => <p key={feature}>{feature}</p>)}</div>
            <div className="mt-4 rounded-2xl bg-white p-4 text-slate-900">
              <LeadCaptureForm source="result_premium_upsell" intent="premium_interest" title="Talk to us about premium" description="Share the workflow you would pay to improve." buttonLabel="Send interest" compact />
            </div>
          </div>
          <FeedbackWidget context={{ screen: "result_panel", resultId: result.id, reportId: savedReport?.id }} title="Was this useful?" compact />
        </div>
      </Disclosure>
    </section>
  );
}