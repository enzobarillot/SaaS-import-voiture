import Link from "next/link";
import { FeedbackWidget } from "@/components/feedback-widget";
import { LeadCaptureForm } from "@/components/lead-capture-form";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { PREMIUM_FEATURES } from "@/lib/reference-data";
import type { DealVerdict, ProductAccess, ReportDocument, RiskLevel, SimulationResult } from "@/types";
import { MetricCard } from "@/components/form-primitives";

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

function formatCurrency(value: number): string {
  return currency.format(value || 0);
}

function verdictClasses(verdict: DealVerdict) {
  if (verdict === "GOOD DEAL") {
    return {
      badge: "bg-emerald-100 text-emerald-900 border-emerald-200",
      surface: "from-emerald-950 via-emerald-900 to-slate-900"
    };
  }

  if (verdict === "FAIR DEAL") {
    return {
      badge: "bg-amber-100 text-amber-900 border-amber-200",
      surface: "from-slate-900 via-amber-900 to-slate-900"
    };
  }

  return {
    badge: "bg-rose-100 text-rose-900 border-rose-200",
    surface: "from-rose-950 via-slate-900 to-slate-900"
  };
}

function riskClasses(level: RiskLevel) {
  if (level === "LOW") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (level === "MEDIUM") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-rose-100 text-rose-900 border-rose-200";
}

function formatObservedAt(value?: string): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("fr-FR", {
    dateStyle: "medium"
  });
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
      <section className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft md:p-8">
        <div className="border-b border-slate-200 pb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Result screen</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">Decision</h2>
        </div>
        <div className="mt-6 rounded-[1.9rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
          Start with a listing URL or a sample vehicle. The result will show total import cost, France market estimate, verdict, risk, assumptions, checklist, and the save/share actions that turn the decision into a reusable report.
        </div>
      </section>
    );
  }

  const tone = verdictClasses(result.verdict);
  const observedAt = formatObservedAt(result.market.provenance.observedAt);

  return (
    <section className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft md:p-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Result screen</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">Decision</h2>
      </div>

      <div className="mt-6 space-y-6">
        <div className={`rounded-[1.9rem] bg-gradient-to-br ${tone.surface} p-6 text-white shadow-soft`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}>{result.verdict}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClasses(result.risk.level)}`}>{result.risk.level} RISK</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-100">{result.comparison.confidenceLabel}</span>
          </div>
          <h3 className="mt-5 text-3xl font-semibold md:text-4xl">{result.narrative.headline}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">{result.narrative.explanation}</p>
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-100">{result.narrative.verdictReason}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total import cost" value={formatCurrency(result.breakdown.total)} caption="Full landed cost into France." />
            <MetricCard label="France market" value={formatCurrency(result.market.estimatedPrice)} caption={result.market.providerLabel} />
            <MetricCard
              label={result.comparison.direction === "overpay" ? "Estimated overpay" : result.comparison.direction === "break_even" ? "Estimated gap" : "Estimated savings"}
              value={formatCurrency(result.profitOrLoss)}
              tone={result.profitOrLoss >= 0 ? "text-emerald-600" : "text-rose-600"}
              caption={result.comparison.spreadLabel}
            />
            <MetricCard
              label="Risk score"
              value={`${result.risk.level} - ${result.risk.score}/100`}
              tone={result.risk.level === "LOW" ? "text-emerald-600" : result.risk.level === "MEDIUM" ? "text-amber-600" : "text-rose-600"}
              caption="Lower risk means fewer import surprises."
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Comparison source</p>
            <p className="mt-3 text-2xl font-semibold text-ink">{result.market.providerLabel}</p>
            <p className="mt-2 text-sm text-slate-600">{result.market.provenance.sourceLabel}. {observedAt ? `Observed ${observedAt}.` : "No live observation timestamp."}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Confidence and provenance</p>
            <p className="mt-3 text-2xl font-semibold text-ink">{result.comparison.confidenceLabel}</p>
            <p className="mt-2 text-sm text-slate-600">{result.market.provenance.connectorLabel}. {result.market.provenance.note ?? result.market.explanation}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Exact inputs</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Purchase price, mileage, registration date, fuel, and seller inputs come from the user or parser and remain editable before the verdict.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Estimated costs</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Transport, COC, inspection, fiscal power, CO2, and weight can be estimated when missing, and those assumptions are shown in the warnings.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Market confidence</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">The France comparison labels whether it is manual, provider-backed, seeded, or heuristic so the next verification step is clear.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-ink">Why this verdict?</h3>
              <p className="mt-1 text-sm text-slate-600">Here is the answer, why it looks that way, and where the uncertainty still lives.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{result.market.providerLabel}</span>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {result.narrative.whyVerdict.map((reason) => (
              <p key={reason} className="rounded-2xl bg-slate-50 px-4 py-3">{reason}</p>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-ink">Cost breakdown</h3>
            <span className="text-sm font-semibold text-slate-500">{formatCurrency(result.breakdown.total)}</span>
          </div>
          <div className="mt-4 space-y-3">
            {result.breakdown.lines.map((line) => (
              <div key={line.key} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{line.label}</p>
                  {line.note ? <p className="mt-1 text-xs text-slate-500">{line.note}</p> : null}
                </div>
                <span className="font-semibold text-slate-900">{formatCurrency(line.amount)}</span>
              </div>
            ))}
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <p className="font-medium text-ink">VAT impact</p>
                <p className="mt-1 text-xs text-slate-500">{result.breakdown.vat.reason}</p>
                <p className="mt-3 font-semibold text-slate-900">{formatCurrency(result.breakdown.vat.amount)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <p className="font-medium text-ink">Registration estimate</p>
                <p className="mt-1 text-xs text-slate-500">{result.breakdown.registration.fiscalPowerUsed} CV x {result.breakdown.registration.fiscalRateUsed} EUR plus fixed fees</p>
                <p className="mt-3 font-semibold text-slate-900">{formatCurrency(result.breakdown.registration.amount)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <p className="font-medium text-ink">Ecological penalty</p>
                <p className="mt-1 text-xs text-slate-500">CO2 {formatCurrency(result.breakdown.malus.co2Malus)} and weight {formatCurrency(result.breakdown.malus.massMalus)}</p>
                <p className="mt-3 font-semibold text-slate-900">{formatCurrency(result.breakdown.malus.total)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-ink">Risk and assumptions</h3>
            <p className="mt-2 text-sm text-slate-600">{result.risk.level} risk with a score of {result.risk.score}/100.</p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {result.risk.reasons.length > 0 ? result.risk.reasons.map((reason) => <p key={reason} className="rounded-2xl bg-slate-50 px-4 py-3">{reason}</p>) : <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900">Core cost and compliance fields are filled with limited uncertainty.</p>}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-ink">Checklist</h3>
            <p className="mt-2 text-sm text-slate-600">Use this to move from decision to execution without missing the admin steps.</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {result.checklist.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink">{item.label}</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${item.urgency === "required" ? "bg-rose-100 text-rose-900" : "bg-slate-200 text-slate-700"}`}>{item.urgency}</span>
                  </div>
                  <p className="mt-1">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {result.market.comparableListings?.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-ink">Comparable references</h3>
            <p className="mt-2 text-sm text-slate-600">Provider-backed references used by the comparison engine.</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {result.market.comparableListings.map((listing) => (
                <div key={listing.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-medium text-ink">{listing.title}</p>
                  <p className="mt-1">{formatCurrency(listing.price)} - {listing.year} - {listing.mileage.toLocaleString("fr-FR")} km</p>
                  <p className="mt-1 text-xs text-slate-500">{listing.sourceLabel}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {result.warnings.length > 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-lg font-semibold text-amber-900">Visible assumptions</h3>
            <div className="mt-3 space-y-2 text-sm text-amber-900">{result.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Save, share, export</p>
              <p className="mt-2 text-lg font-semibold text-ink">Turn this decision into a reusable report.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={onSaveSnapshot} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400">Save locally</button>
              <button type="button" onClick={onSaveCloud} disabled={cloudBusy} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60">
                {cloudBusy ? "Saving..." : access.canSaveCloud ? "Save to cloud" : "Sign in to save"}
              </button>
              {savedReport ? (
                <button type="button" onClick={onCreateShare} disabled={cloudBusy} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60">{savedReport.shareId ? "Refresh share link" : "Create share link"}</button>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              {savedReport ? (
                <div className="space-y-2">
                  <p className="font-semibold text-ink">Cloud report ready</p>
                  <div className="flex flex-wrap gap-3">
                    <Link href={savedReport.printablePath} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Printable view</Link>
                    <Link href={savedReport.exportPath} onClick={() => void trackEvent(ANALYTICS_EVENTS.exportActionUsed, { reportId: savedReport.id, source: "result_panel" })} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Export JSON</Link>
                    {savedReport.sharePath ? <Link href={savedReport.sharePath} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Open shared link</Link> : null}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-ink">Account value</p>
                  <p className="mt-2">{access.canSaveCloud ? "Save this decision to your cloud history, reopen it later, and share a printable route." : "Create a free account to turn decisions into cloud reports, printable pages, and shareable links."}</p>
                </div>
              )}
              {cloudMessage ? <p className="mt-3">{cloudMessage}</p> : null}
            </div>
            <div className="rounded-2xl bg-ink p-4 text-sm text-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">Premium interest</p>
                  <p className="mt-2 text-slate-300">Useful for validating which pro workflows deserve billing and deeper provider work.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void trackEvent(ANALYTICS_EVENTS.premiumCtaClicked, { location: "result_panel", cta: "request_premium_access", intent: "premium_interest" })}
                  className="rounded-2xl border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-white/50"
                >
                  Request pro
                </button>
              </div>
              <div className="mt-3 space-y-2">{PREMIUM_FEATURES.map((feature) => <p key={feature}>{feature}</p>)}</div>
              <div id="result-premium-lead" className="mt-4 rounded-2xl bg-white p-4 text-slate-900">
                <LeadCaptureForm
                  source="result_premium_upsell"
                  intent="premium_interest"
                  title="Talk to us about premium"
                  description="Share the workflow you would pay to improve."
                  buttonLabel="Send premium interest"
                  compact
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <FeedbackWidget
            context={{
              screen: "result_panel",
              resultId: result.id,
              reportId: savedReport?.id
            }}
            title="Was this decision useful?"
          />
        </div>
      </div>
    </section>
  );
}