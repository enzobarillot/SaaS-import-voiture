"use client";

import { LeadCaptureForm } from "@/components/lead-capture-form";
import { PricingPlans } from "@/components/pricing-plans";
import type { LeadIntent } from "@/types";

type PlanId = "anonymous" | "account_free" | "premium";

type LandingSectionsProps = {
  onStartUrl: () => void;
  onStartManual: () => void;
  onLoadDemo: () => void;
  onPlanCta: (planId: PlanId, intent?: LeadIntent) => void;
  onCta: (cta: string, location: string, destination?: string) => void;
};

const HOW_IT_WORKS = [
  { title: "Paste listing", text: "Start from a marketplace URL or fill the minimum vehicle fields manually." },
  { title: "Get the answer", text: "See landed cost, France market gap, risk level, warnings, and checklist in one result." },
  { title: "Decide faster", text: "Save the report, share it, print it, or compare the next candidate with the same structure." }
];

const WHAT_YOU_GET = [
  "A deal verdict that separates purchase price from real landed cost.",
  "A market comparison with provenance: manual, provider-backed, seeded, or heuristic.",
  "Visible assumptions for VAT, malus, registration, transport, COC, and inspection.",
  "Account reports that survive browser changes and produce shareable routes."
];

const TRUST_POINTS = [
  { title: "Assumptions stay visible", text: "Missing or estimated fields are shown as warnings instead of being hidden inside the answer." },
  { title: "Provider provenance is labeled", text: "The result names the market source and confidence so users know what to verify before buying." },
  { title: "Report routes are reusable", text: "Saved reports can be reopened, printed, shared, and exported without changing the calculation result." }
];

const FAQS = [
  { question: "Who is this for?", answer: "French buyers, dealers, brokers, and import services checking whether a foreign listing still makes sense after import costs." },
  { question: "Can I trust the verdict?", answer: "The verdict is decision support, not a guarantee. It shows the cost stack, market source, confidence, and warnings so the next verification step is clear." },
  { question: "Why create an account?", answer: "Anonymous use is good for trying the engine. An account saves cloud reports, keeps history across sessions, and unlocks share and export workflows." },
  { question: "Is payment live?", answer: "No. Premium is a launch placeholder for measuring interest before adding billing or deeper provider systems." }
];

export function LandingSections({ onStartUrl, onStartManual, onLoadDemo, onPlanCta, onCta }: LandingSectionsProps) {
  return (
    <div className="space-y-12">
      <section className="relative isolate min-h-[76vh] overflow-hidden bg-ink px-6 py-16 text-white md:px-10 lg:px-16">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.14) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
        <div className="absolute bottom-0 right-0 hidden w-[54rem] translate-x-24 translate-y-16 lg:block">
          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-soft backdrop-blur">
            <div className="rounded-[1.5rem] bg-white p-5 text-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Example report preview</p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">BMW 320d M Sport, Germany</h2>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">FAIR DEAL</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-400">Landed</p><p className="mt-2 text-xl font-semibold">29 910 EUR</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-400">Market</p><p className="mt-2 text-xl font-semibold">33 200 EUR</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-400">Risk</p><p className="mt-2 text-xl font-semibold">MEDIUM</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-400">Source</p><p className="mt-2 text-xl font-semibold">Provider</p></div>
              </div>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">CO2 and VAT assumptions stay visible until verified.</div>
            </div>
          </div>
        </div>
        <div className="relative mx-auto flex min-h-[60vh] max-w-7xl items-center">
          <div className="max-w-3xl space-y-7">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink">ImportScore Decision Engine</span>
              <span className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">France import beta</span>
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-5xl leading-tight md:text-7xl">France car import verdict before you buy.</h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-200">Paste a listing, fill the missing fields, and get the real landed cost, market gap, risk signals, and next-step checklist in minutes.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => { onCta("start_url", "hero", "#try"); onStartUrl(); }} className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600">Paste listing URL</button>
              <button type="button" onClick={() => { onCta("demo", "hero", "#try"); onLoadDemo(); }} className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/60">Try sample vehicle</button>
              <button type="button" onClick={() => { onCta("pricing", "hero", "#pricing"); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }} className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/60">View plans</button>
            </div>
            <div className="grid max-w-3xl gap-3 text-sm text-slate-200 sm:grid-cols-3">
              <p className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">For buyers checking foreign listings before deposit.</p>
              <p className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">For pros who need repeatable import decisions.</p>
              <p className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">Built around transparent assumptions, not black-box scores.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Social proof slot</p><p className="mt-3 text-sm text-slate-600">Beta buyer quotes and launch partner logos can drop here once interviews are public.</p></div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Workflow signal</p><p className="mt-3 text-sm text-slate-600">Designed for paste listing, get answer, decide faster across multiple candidates.</p></div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Trust signal</p><p className="mt-3 text-sm text-slate-600">Every result labels confidence, source provenance, and visible assumptions.</p></div>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">Paste listing. Get answer. Decide faster.</h2>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {HOW_IT_WORKS.map((item, index) => (
              <article key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{index + 1}</span>
                <h3 className="mt-5 text-xl font-semibold text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">What you get</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">A report built for the actual import decision.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">The product is intentionally narrow: make a better go/no-go call on a specific car before you spend time, money, or reputation on it.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {WHAT_YOU_GET.map((item) => (
              <p key={item} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-soft">{item}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-slate-900 p-6 text-white shadow-soft md:p-8">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Trust and credibility</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Honest confidence beats fake precision.</h2>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {TRUST_POINTS.map((point) => (
              <article key={point.title} className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5">
                <h3 className="text-lg font-semibold">{point.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-200">{point.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pricing and access</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">Clear plans now, billing later.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">The beta already separates anonymous use, account-backed reports, and premium intent. No payment integration is live yet.</p>
          </div>
          <PricingPlans onPlanCta={onPlanCta} />
        </div>
      </section>

      <section id="premium-request" className="scroll-mt-8 px-6 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft md:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Beta access</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink">Need this for a pro workflow?</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">Leave a short note if you handle imports, sourcing, dealer stock, or marketplace partnerships. This helps prioritize the next provider and workflow improvements.</p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft md:p-8">
            <LeadCaptureForm source="landing_beta_access" intent="premium_interest" buttonLabel="Request beta follow-up" />
          </div>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">Straight answers for first-time users.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FAQS.map((faq) => (
              <article key={faq.question} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
                <h3 className="text-lg font-semibold text-ink">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-4 md:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-[2rem] border border-orange-200 bg-orange-50 p-6 shadow-soft md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange-700">Ready to try it</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink">Run one decision with a listing or sample car.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">The fastest path is simple: paste listing, review missing fields, compute verdict, then save or share if it matters.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => { onCta("final_start_url", "final_cta", "#try"); onStartUrl(); }} className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600">Start with URL</button>
            <button type="button" onClick={() => { onCta("final_demo", "final_cta", "#try"); onLoadDemo(); }} className="rounded-full border border-orange-300 px-5 py-3 text-sm font-semibold text-orange-800 transition hover:border-orange-400">Load sample</button>
          </div>
        </div>
      </section>
    </div>
  );
}