"use client";

import { FormEvent, useState } from "react";
import { PricingPlans } from "@/components/pricing-plans";
import type { LeadIntent } from "@/types";

type PlanId = "anonymous" | "account_free" | "premium";

type LandingSectionsProps = {
  onSubmitUrl: (url: string) => void;
  onStartManual: () => void;
  onPlanCta: (planId: PlanId, intent?: LeadIntent) => void;
  onCta: (cta: string, location: string, destination?: string) => void;
};

const STEPS = [
  { title: "Paste", text: "Add a listing URL or switch to manual entry." },
  { title: "Calculate", text: "See landed cost, France market gap, and risk together." },
  { title: "Decide", text: "Keep only cars that survive the numbers." }
];

const FAQS = [
  { question: "Who is it for?", answer: "French buyers, import brokers, and dealers checking whether a foreign listing is worth pursuing." },
  { question: "Can I trust the verdict?", answer: "It is decision support, not a guarantee. Assumptions, provider source, and confidence stay available in the result." },
  { question: "Why create an account?", answer: "Accounts add cloud-saved reports, shareable links, printable views, and export workflows." },
  { question: "Is Pro available now?", answer: "Pro is a request path for repeat import workflows before billing is enabled." }
];

export function LandingSections({ onSubmitUrl, onStartManual, onPlanCta, onCta }: LandingSectionsProps) {
  const [url, setUrl] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCta("hero_url_submit", "hero", "#simulator");
    onSubmitUrl(url);
  }

  return (
    <div className="bg-white">
      <section className="px-6 pb-16 pt-20 md:px-10 md:pb-20 md:pt-28 lg:px-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">France car import beta</p>
          <h1 className="mt-5 font-display text-5xl leading-tight text-ink md:text-7xl">Know if an import is a good deal.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">Paste a listing, get the real import cost, and know if the deal is worth pursuing.</p>

          <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-soft sm:flex-row">
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste a mobile.de, AutoScout24, Leboncoin, or La Centrale URL"
              className="min-h-12 flex-1 rounded-xl border-0 px-4 text-sm text-slate-900 outline-none"
            />
            <button type="submit" className="rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Get verdict
            </button>
          </form>

          <button type="button" onClick={() => { onCta("manual_entry", "hero", "#simulator"); onStartManual(); }} className="mt-4 text-sm font-semibold text-ink underline-offset-4 hover:underline">
            Enter details manually
          </button>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 px-6 py-12 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="px-2 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">0{index + 1}</p>
              <h2 className="mt-3 text-xl font-semibold text-ink">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="px-6 py-14 md:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink">Start free. Save reports when the decision matters.</h2>
          </div>
          <PricingPlans onPlanCta={onPlanCta} />
        </div>
      </section>

      <section className="px-6 pb-16 md:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-semibold text-ink">FAQ</h2>
          <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink">
                  {faq.question}
                  <span className="text-slate-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-8 text-sm text-slate-500 md:px-10 lg:px-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <span className="font-semibold text-ink">ImportScore</span>
          <span>Transparent import decisions for France.</span>
        </div>
      </footer>
    </div>
  );
}