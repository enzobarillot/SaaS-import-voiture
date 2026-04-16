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
    name: "Anonymous free",
    price: "Try now",
    badge: "No account",
    description: "Best for a first check when you want a quick landed-cost answer before sharing your email.",
    features: ["5 browser-local decisions", "Manual or URL input", "Local history on this device", "Visible assumptions and warnings"],
    cta: "Start free"
  },
  {
    id: "account_free",
    name: "Account free",
    price: "Free beta",
    badge: "Recommended",
    description: "Best for buyers comparing multiple cars and wanting reusable reports across sessions.",
    features: ["Cloud saved reports", "Printable and shareable report routes", "Export-ready JSON", "More generous simulation access"],
    cta: "Create account",
    featured: true
  },
  {
    id: "premium",
    name: "Premium placeholder",
    price: "Request access",
    badge: "Coming next",
    description: "For import professionals, dealers, and serious buyers who need deeper provider coverage and workflow speed.",
    features: ["Unlimited simulations", "Advanced comparison workflow", "Priority provider connectors", "Pro sourcing and portfolio features"],
    cta: "Request pro plan",
    intent: "premium_interest"
  }
];

export function PricingPlans({ onPlanCta }: PricingPlansProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {PLANS.map((plan) => (
        <article
          key={plan.id}
          className={`rounded-[1.75rem] border p-6 shadow-soft ${
            plan.featured ? "border-orange-200 bg-orange-50" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{plan.badge}</p>
              <h3 className="mt-3 text-2xl font-semibold text-ink">{plan.name}</h3>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">{plan.price}</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>
          <div className="mt-5 space-y-2 text-sm text-slate-700">
            {plan.features.map((feature) => (
              <p key={feature} className="rounded-2xl bg-white/75 px-4 py-3">{feature}</p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onPlanCta?.(plan.id, plan.intent)}
            className={`mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              plan.featured ? "bg-orange-500 text-white hover:bg-orange-600" : "border border-slate-300 text-slate-700 hover:border-slate-400"
            }`}
          >
            {plan.cta}
          </button>
        </article>
      ))}
    </div>
  );
}