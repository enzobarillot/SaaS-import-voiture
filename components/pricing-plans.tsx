import type { LeadIntent } from "@/types";

type PlanId = "anonymous" | "account_free" | "premium";

type PricingPlansProps = {
  onPlanCta?: (planId: PlanId, intent?: LeadIntent) => void;
};

const PLANS: Array<{
  id: PlanId;
  name: string;
  price: string;
  badge: string;
  description: string;
  features: string[];
  cta: string;
  intent?: LeadIntent;
  featured?: boolean;
}> = [
  {
    id: "anonymous",
    name: "Try",
    price: "Free",
    badge: "No account",
    description: "Run a few decisions locally before signing up.",
    features: ["5 browser-local decisions", "Manual or URL input", "Local history", "Visible assumptions"],
    cta: "Start"
  },
  {
    id: "account_free",
    name: "Save",
    price: "Free beta",
    badge: "Recommended",
    description: "Keep reports in the cloud and reuse them later.",
    features: ["Cloud saved reports", "Printable and shareable routes", "Export-ready JSON", "More simulation access"],
    cta: "Create account",
    featured: true
  },
  {
    id: "premium",
    name: "Pro",
    price: "Request",
    badge: "Coming next",
    description: "For repeat import workflows and richer provider coverage.",
    features: ["Unlimited simulations", "Advanced comparison workflow", "Priority provider connectors", "Portfolio-level sourcing"],
    cta: "Request pro",
    intent: "premium_interest"
  }
];

export function PricingPlans({ onPlanCta }: PricingPlansProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {PLANS.map((plan) => (
        <article key={plan.id} className={`rounded-[1.5rem] border p-6 ${plan.featured ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-ink"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${plan.featured ? "text-slate-300" : "text-slate-500"}`}>{plan.badge}</p>
              <h3 className="mt-3 text-2xl font-semibold">{plan.name}</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${plan.featured ? "bg-white text-ink" : "bg-slate-100 text-slate-700"}`}>{plan.price}</span>
          </div>
          <p className={`mt-4 text-sm leading-6 ${plan.featured ? "text-slate-200" : "text-slate-600"}`}>{plan.description}</p>
          <details className="mt-5">
            <summary className={`cursor-pointer list-none text-sm font-semibold ${plan.featured ? "text-white" : "text-ink"}`}>Plan details</summary>
            <div className={`mt-3 space-y-2 text-sm ${plan.featured ? "text-slate-200" : "text-slate-600"}`}>
              {plan.features.map((feature) => <p key={feature}>{feature}</p>)}
            </div>
          </details>
          <button type="button" onClick={() => onPlanCta?.(plan.id, plan.intent)} className={`mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${plan.featured ? "bg-white text-ink hover:bg-slate-100" : "border border-slate-300 text-slate-700 hover:border-slate-400"}`}>
            {plan.cta}
          </button>
        </article>
      ))}
    </div>
  );
}