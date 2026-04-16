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
    description: "Run a few local decisions before signing up.",
    features: ["5 browser-local decisions", "Manual or URL input", "Local history", "Visible assumptions"],
    cta: "Start"
  },
  {
    id: "account_free",
    name: "Save",
    price: "Free beta",
    badge: "Recommended",
    description: "Keep reports in the cloud and share them later.",
    features: ["Cloud saved reports", "Printable and shareable routes", "Export-ready JSON", "More simulation access"],
    cta: "Create account",
    featured: true
  },
  {
    id: "premium",
    name: "Pro",
    price: "Request",
    badge: "Coming next",
    description: "For repeat import workflows and richer comparison coverage.",
    features: ["Unlimited simulations", "Advanced comparison workflow", "Priority provider connectors", "Portfolio-level sourcing"],
    cta: "Request pro",
    intent: "premium_interest"
  }
];

export function PricingPlans({ onPlanCta }: PricingPlansProps) {
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {PLANS.map((plan) => (
        <div key={plan.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold text-ink">{plan.name}</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${plan.featured ? "bg-ink text-white" : "bg-slate-100 text-slate-600"}`}>{plan.badge}</span>
              <span className="text-sm font-semibold text-slate-900">{plan.price}</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{plan.description}</p>
            <details className="mt-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">Details</summary>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                {plan.features.map((feature) => <span key={feature}>{feature}</span>)}
              </div>
            </details>
          </div>
          <button
            type="button"
            onClick={() => onPlanCta?.(plan.id, plan.intent)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${plan.featured ? "bg-ink text-white hover:bg-slate-800" : "border border-slate-300 text-slate-700 hover:border-slate-400"}`}
          >
            {plan.cta}
          </button>
        </div>
      ))}
    </div>
  );
}