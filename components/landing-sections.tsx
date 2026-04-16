"use client";

import { FormEvent, useState } from "react";
import { PricingPlans } from "@/components/pricing-plans";
import type { LeadIntent } from "@/types";

type PlanId = "anonymous" | "account_free" | "premium";

type LandingSectionsProps = {
  onStartUrl: () => void;
  onSubmitUrl: (url: string) => void;
  onStartManual: () => void;
  onLoadDemo: () => void;
  onPlanCta: (planId: PlanId, intent?: LeadIntent) => void;
  onCta: (cta: string, location: string, destination?: string) => void;
};

const STEPS = [
  { title: "Paste a listing", text: "Start from a marketplace URL or enter the car manually." },
  { title: "See the real cost", text: "Import fees, tax assumptions, market gap, and risk are calculated together." },
  { title: "Decide", text: "Get a clear verdict before you spend time on the wrong car." }
];

const BENEFITS = [
  { title: "Landed cost first", text: "Purchase price is not the answer. Total import cost is." },
  { title: "Market-aware", text: "The result compares against the France market and labels confidence." },
  { title: "Report-ready", text: "Save, share, print, or export decisions when a car is worth pursuing." }
];

const FAQS = [
  { question: "Who is ImportScore for?", answer: "French buyers, import professionals, brokers, and dealers who need a fast go/no-go view on foreign listings." },
  { question: "Is the verdict guaranteed?", answer: "No. It is decision support. The app keeps assumptions, provider source, and confidence visible so users know what to verify." },
  { question: "Why create an account?", answer: "Accounts add cloud-saved reports, shareable routes, printable views, and export workflows." },
  { question: "Is premium live?", answer: "Not yet. Premium is a measured interest path for pro workflows before billing is added." }
];

export function LandingSections({ onStartUrl, onSubmitUrl, onStartManual, onLoadDemo, onPlanCta, onCta }: LandingSectionsProps) {
  const [url, setUrl] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCta("hero_url_submit", "hero", "#simulator");
    onSubmitUrl(url);
  }

  return (
    <div id="top" className="bg-white">
      <section className="px-6 py-20 md:px-10 md:py-28 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">France car import beta</p>
            <h1 className="mt-5 font-display text-5xl leading-tight text-ink md:text-7xl">Know if an import is a good deal.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Paste a listing, get the real import cost, and see the deal verdict before you buy.</p>
            <form onSubmit={handleSubmit} className="mt-8 rounded-[1.4rem] border border-slate-200 bg-white p-2 shadow-soft md:flex md:items-center md:gap-2">
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="Paste a mobile.de, AutoScout24, Leboncoin, or La Centrale URL"
                className="min-h-12 w-full rounded-2xl border-0 px-4 text-sm text-slate-900 outline-none"
              />
              <button type="submit" className="mt-2 w-full rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 md:mt-0 md:w-auto">
                Get verdict
              </button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <button type="button" onClick={() => { onCta("manual_entry", "hero", "#simulator"); onStartManual(); }} className="font-semibold text-ink underline-offset-4 hover:underline">Enter manually</button>
              <button type="button" onClick={() => { onCta("sample_vehicle", "hero", "#simulator"); onLoadDemo(); }} className="font-semibold text-ink underline-offset-4 hover:underline">Try a sample</button>
              <span>Transparent cost, risk, and market assumptions.</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-soft">
            <div className="rounded-[1.5rem] bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Example verdict</p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">BMW 320d, Germany</h2>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">FAIR DEAL</span>
              </div>
              <div className="mt-8 grid gap-5 sm:grid-cols-3">
                <div><p className="text-xs uppercase tracking-[0.15em] text-slate-400">Total cost</p><p className="mt-2 text-3xl font-semibold text-ink">29 910 EUR</p></div>
                <div><p className="text-xs uppercase tracking-[0.15em] text-slate-400">Gain/loss</p><p className="mt-2 text-3xl font-semibold text-emerald-700">+3 290 EUR</p></div>
                <div><p className="text-xs uppercase tracking-[0.15em] text-slate-400">Risk</p><p className="mt-2 text-3xl font-semibold text-amber-700">MEDIUM</p></div>
              </div>
              <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">The answer stays simple. Details stay available when you need them.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <article key={step.title} className="rounded-[1.5rem] bg-slate-50 p-6">
                <span className="text-sm font-semibold text-orange-600">0{index + 1}</span>
                <h3 className="mt-4 text-xl font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-14 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Why it works</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink">Decision support without the clutter.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <article key={benefit.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-ink">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-6 py-14 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Plans</p>
              <h2 className="mt-3 text-3xl font-semibold text-ink">Start free. Save reports when it matters.</h2>
            </div>
          </div>
          <PricingPlans onPlanCta={onPlanCta} />
        </div>
      </section>

      <section className="px-6 py-14 md:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-semibold text-ink">Questions</h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-[1.5rem] border border-slate-200 bg-white">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-[2rem] bg-ink p-8 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Ready to check a listing?</h2>
            <p className="mt-3 text-sm text-slate-300">Start with a URL or load a sample decision.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => { onCta("final_start_url", "final_cta", "#simulator"); onStartUrl(); }} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">Start simulation</button>
            <button type="button" onClick={() => { onCta("final_demo", "final_cta", "#simulator"); onLoadDemo(); }} className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white">Try sample</button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-8 text-sm text-slate-500 md:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span>ImportScore</span>
          <span>France import decisions with transparent assumptions.</span>
        </div>
      </footer>
    </div>
  );
}