import type { ReactNode } from "react";
import Link from "next/link";
import { FeedbackWidget } from "@/components/feedback-widget";
import { LeadCaptureForm } from "@/components/lead-capture-form";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { PREMIUM_FEATURES } from "@/lib/reference-data";
import type { DealVerdict, EstimateQuality, EstimateValueStatus, ProductAccess, ReportDocument, RiskLevel, SimulationResult } from "@/types";

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

function confidenceTone(confidence: EstimateQuality["confidence"]): string {
  if (confidence === "high") return "text-emerald-300";
  if (confidence === "medium") return "text-sky-300";
  return "text-amber-300";
}

function confidenceBadgeTone(confidence: EstimateQuality["confidence"]): string {
  if (confidence === "incomplete") return "bg-amber-100 text-amber-950";
  if (confidence === "low") return "bg-amber-100 text-amber-950";
  if (confidence === "medium") return "bg-sky-100 text-sky-950";
  return "bg-emerald-100 text-emerald-950";
}

function statusLabel(status: EstimateValueStatus): string {
  if (status === "user_entered") return "User-entered";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatObservedAt(value?: string): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("fr-FR", { dateStyle: "medium" });
}

function fallbackQuality(result: SimulationResult): EstimateQuality {
  return {
    confidence: result.market.confidence,
    label: result.comparison.confidenceLabel,
    isComplete: true,
    canShowStrongVerdict: true,
    criticalMissingFields: [],
    missingFields: [],
    confirmedFields: [],
    userEnteredFields: [],
    estimatedFields: [],
    assumptions: [],
    summary: `${result.comparison.confidenceLabel}. Saved before detailed field-level confidence was introduced.`,
    nextAction: "Review the saved assumptions before relying on this report."
  };
}

function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl bg-white p-5 ring-1 ring-slate-200/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink">
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
      <section className="rounded-[2rem] bg-white p-8 shadow-soft ring-1 ring-slate-200/70 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Decision</p>
        <h2 className="mt-3 text-3xl font-semibold text-ink">Your verdict appears here.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Paste a listing, extract details, then complete the highlighted fields before trusting the estimate.</p>
      </section>
    );
  }

  const quality = result.estimateQuality ?? fallbackQuality(result);
  const isIncomplete = quality.confidence === "incomplete";
  const observedAt = formatObservedAt(result.market.provenance.observedAt);
  const spreadLabel = result.comparison.direction === "overpay" ? "Estimated overpay" : result.comparison.direction === "break_even" ? "Estimated gap" : "Estimated savings";
  const assumptionsByStatus = quality.assumptions.reduce<Record<EstimateValueStatus, typeof quality.assumptions>>(
    (groups, item) => {
      groups[item.status].push(item);
      return groups;
    },
    { confirmed: [], user_entered: [], estimated: [], missing: [] }
  );

  return (
    <section className="space-y-4">
      <div className={`rounded-[2rem] p-7 text-white shadow-soft md:p-10 ${isIncomplete ? "bg-slate-950" : "bg-ink"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{isIncomplete ? "Provisional import cost" : "Total import cost"}</p>
            <h2 className="mt-3 text-5xl font-semibold tracking-tight md:text-7xl">{formatCurrency(result.breakdown.total)}</h2>
          </div>
          <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${isIncomplete ? "bg-amber-100 text-amber-950" : verdictTone(result.verdict)}`}>
            {isIncomplete ? "INCOMPLETE ESTIMATE" : result.verdict}
          </span>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{spreadLabel}</p>
            <p className={`mt-2 text-4xl font-semibold ${result.profitOrLoss >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatCurrency(result.profitOrLoss)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Risk</p>
            <p className={`mt-2 text-4xl font-semibold ${riskTone(result.risk.level)}`}>{result.risk.level}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Confidence</p>
            <p className={`mt-2 text-4xl font-semibold ${confidenceTone(quality.confidence)}`}>{quality.label}</p>
          </div>
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-7 text-slate-200">{isIncomplete ? quality.summary : result.narrative.verdictReason}</p>
        {isIncomplete ? (
          <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-100/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">{quality.nextAction}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {quality.assumptions.filter((item) => item.status === "missing" && item.critical).map((item) => (
                <span key={item.field} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-50">{item.label}</span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/70">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">France market</p>
            <p className="mt-1 text-xl font-semibold text-ink">{formatCurrency(result.market.estimatedPrice)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Source</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{result.market.providerLabel}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Market confidence</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{result.comparison.confidenceLabel}{observedAt ? `, ${observedAt}` : ""}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Estimate state</p>
            <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${confidenceBadgeTone(quality.confidence)}`}>{quality.label}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
        <button type="button" onClick={onSaveCloud} disabled={cloudBusy} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">{cloudBusy ? "Saving..." : access.canSaveCloud ? "Save" : "Sign in to save"}</button>
        <button type="button" onClick={onSaveSnapshot} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Local save</button>
        {savedReport ? <button type="button" onClick={onCreateShare} disabled={cloudBusy} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">{savedReport.shareId ? "Refresh link" : "Share"}</button> : null}
        {savedReport ? <Link href={savedReport.printablePath} className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">Print</Link> : null}
        {savedReport ? <Link href={savedReport.exportPath} onClick={() => void trackEvent(ANALYTICS_EVENTS.exportActionUsed, { reportId: savedReport.id, source: "result_panel" })} className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">Export</Link> : null}
        {savedReport?.sharePath ? <Link href={savedReport.sharePath} className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">Open shared</Link> : null}
        {cloudMessage ? <p className="basis-full pt-1 text-sm text-slate-600">{cloudMessage}</p> : null}
      </div>

      <Disclosure title="Cost breakdown">
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
            <p className="rounded-xl bg-slate-50 p-4"><span className="block font-medium text-ink">VAT</span><span className="mt-1 block text-xs">{result.breakdown.vat.reason}</span><span className="mt-3 block font-semibold text-slate-900">{formatCurrency(result.breakdown.vat.amount)}</span></p>
            <p className="rounded-xl bg-slate-50 p-4"><span className="block font-medium text-ink">Registration</span><span className="mt-1 block text-xs">{result.breakdown.registration.fiscalPowerUsed} CV x {result.breakdown.registration.fiscalRateUsed} EUR</span><span className="mt-3 block font-semibold text-slate-900">{formatCurrency(result.breakdown.registration.amount)}</span></p>
            <p className="rounded-xl bg-slate-50 p-4"><span className="block font-medium text-ink">Malus</span><span className="mt-1 block text-xs">{result.breakdown.malus.referenceLabel}</span><span className="mt-3 block font-semibold text-slate-900">{formatCurrency(result.breakdown.malus.total)}</span></p>
          </div>
        </div>
      </Disclosure>

      <Disclosure title="Market details">
        <div className="space-y-3 text-sm text-slate-600">
          <p><span className="font-semibold text-ink">{result.market.provenance.sourceLabel}</span> - {result.market.provenance.connectorLabel}. {result.market.provenance.note ?? result.market.explanation}</p>
          <p>{result.comparison.spreadLabel}</p>
          {result.market.comparableListings?.length ? (
            <div className="space-y-2">
              {result.market.comparableListings.map((listing) => (
                <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <div><p className="font-medium text-ink">{listing.title}</p><p className="text-xs text-slate-500">{listing.sourceLabel}</p></div>
                  <p>{formatCurrency(listing.price)} - {listing.year} - {listing.mileage.toLocaleString("fr-FR")} km</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Disclosure>

      <Disclosure title="Confidence details">
        <div className="space-y-5 text-sm text-slate-600">
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-slate-700">{quality.summary} {quality.nextAction}</p>
          {(["missing", "estimated", "user_entered", "confirmed"] as EstimateValueStatus[]).map((status) => (
            assumptionsByStatus[status].length > 0 ? (
              <div key={status}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{statusLabel(status)}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {assumptionsByStatus[status].map((item) => (
                    <p key={`${status}-${item.field}-${item.note}`} className={`rounded-xl px-4 py-3 ${status === "missing" ? "bg-amber-50 text-amber-950" : "bg-slate-50"}`}>
                      <span className="font-semibold text-ink">{item.label}</span>
                      <span className="mt-1 block text-xs leading-5">{item.note}</span>
                    </p>
                  ))}
                </div>
              </div>
            ) : null
          ))}
          {result.warnings.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Warnings</p>
              <div className="mt-2 space-y-2">
                {result.warnings.map((warning) => <p key={warning} className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900">{warning}</p>)}
              </div>
            </div>
          ) : null}
        </div>
      </Disclosure>

      <Disclosure title="Checklist">
        <div className="space-y-2 text-sm text-slate-600">
          {result.checklist.map((item) => (
            <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{item.label}</p>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.urgency}</span>
              </div>
              <p className="mt-1">{item.description}</p>
            </div>
          ))}
        </div>
      </Disclosure>

      <Disclosure title="Feedback and Pro">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl bg-ink p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">Pro interest</p>
            <div className="mt-2 space-y-1 text-sm">{PREMIUM_FEATURES.map((feature) => <p key={feature}>{feature}</p>)}</div>
            <div className="mt-4 rounded-xl bg-white p-4 text-slate-900">
              <LeadCaptureForm source="result_premium_upsell" intent="premium_interest" title="Talk to us about premium" description="Share the workflow you would pay to improve." buttonLabel="Send interest" compact />
            </div>
          </div>
          <FeedbackWidget context={{ screen: "result_panel", resultId: result.id, reportId: savedReport?.id }} title="Was this useful?" compact />
        </div>
      </Disclosure>
    </section>
  );
}