"use client";

import { FormEvent, useState } from "react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import type { FeedbackContext, FeedbackSentiment } from "@/types";

type FeedbackWidgetProps = {
  context: FeedbackContext;
  title?: string;
  compact?: boolean;
};

const SENTIMENT_OPTIONS: Array<{ value: FeedbackSentiment; label: string }> = [
  { value: "positive", label: "Useful" },
  { value: "neutral", label: "Unclear" },
  { value: "negative", label: "Missing" }
];

export function FeedbackWidget({ context, title = "Quick feedback", compact = false }: FeedbackWidgetProps) {
  const [sentiment, setSentiment] = useState<FeedbackSentiment>("positive");
  const [rating, setRating] = useState(4);
  const [message, setMessage] = useState("");
  const [wouldPay, setWouldPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(undefined);

    try {
      const feedbackContext = {
        ...context,
        pagePath: typeof window !== "undefined" ? window.location.pathname : context.pagePath
      };
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sentiment, rating, message, wouldPay, context: feedbackContext })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok || payload.error) {
        setStatus(payload.error ?? "Unable to save feedback.");
        return;
      }

      setStatus("Thanks. Feedback saved.");
      setMessage("");
      void trackEvent(ANALYTICS_EVENTS.feedbackSubmitted, {
        screen: context.screen,
        sentiment,
        rating,
        wouldPay
      });
    } catch {
      setStatus("Unable to save feedback right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">What felt trustworthy, confusing, or worth paying for?</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SENTIMENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSentiment(option.value)}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              sentiment === option.value ? "border-orange-300 bg-orange-50 text-orange-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="font-medium text-slate-700">Rating</span>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`h-9 w-9 rounded-full border text-sm font-semibold transition ${
              rating === value ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <textarea
        required
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={compact ? 3 : 4}
        placeholder="One sentence is enough."
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
      />
      <label className="flex items-start gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={wouldPay}
          onChange={(event) => setWouldPay(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
        />
        <span>I would consider paying for this if provider coverage and workflow depth keep improving.</span>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Sending..." : "Send feedback"}
      </button>
      {status ? <p className="text-sm text-slate-600">{status}</p> : null}
    </form>
  );
}