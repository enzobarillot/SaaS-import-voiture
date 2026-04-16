"use client";

import { FormEvent, useState } from "react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import type { LeadIntent } from "@/types";

type LeadCaptureFormProps = {
  source: string;
  intent: LeadIntent;
  title?: string;
  description?: string;
  buttonLabel?: string;
  compact?: boolean;
};

const ROLE_OPTIONS = [
  "Private buyer",
  "Dealer or importer",
  "Broker or sourcing pro",
  "Partner or service provider"
];

export function LeadCaptureForm({
  source,
  intent,
  title = "Request early access",
  description = "Tell us what you want to use ImportScore for. We will keep the beta list focused and useful.",
  buttonLabel = "Request access",
  compact = false
}: LeadCaptureFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(undefined);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          message,
          source,
          intent,
          pagePath: window.location.pathname
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok || payload.error) {
        setStatus(payload.error ?? "Unable to capture this request.");
        return;
      }

      setStatus("Thanks. Your request was captured for beta follow-up.");
      setEmail("");
      setMessage("");
      void trackEvent(ANALYTICS_EVENTS.leadSubmitted, { source, intent, role });
    } catch {
      setStatus("Unable to capture this request right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <h3 className={compact ? "text-lg font-semibold text-ink" : "text-2xl font-semibold text-ink"}>{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className={compact ? "grid gap-3" : "grid gap-3 md:grid-cols-[1fr_0.8fr]"}>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Optional: what workflow are you trying to improve?"
        rows={compact ? 3 : 4}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {busy ? "Sending..." : buttonLabel}
      </button>
      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
    </form>
  );
}