import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export type FieldState = "default" | "error" | "missing" | "recommended";

function fieldStateTone(state: FieldState) {
  switch (state) {
    case "error":
      return {
        frame: "border-rose-300 bg-rose-50/80",
        label: "text-rose-800",
        hint: "text-rose-700"
      };
    case "missing":
      return {
        frame: "border-amber-300 bg-amber-50/80",
        label: "text-amber-900",
        hint: "text-amber-700"
      };
    case "recommended":
      return {
        frame: "border-sky-300 bg-sky-50/70",
        label: "text-sky-900",
        hint: "text-sky-700"
      };
    default:
      return {
        frame: "border-slate-200 bg-white",
        label: "text-slate-700",
        hint: "text-slate-500"
      };
  }
}

export function Field({
  label,
  children,
  hint,
  state = "default",
  stateLabel
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  state?: FieldState;
  stateLabel?: string;
}) {
  const tone = fieldStateTone(state);

  return (
    <label className={`flex flex-col gap-2 rounded-3xl border p-4 text-sm ${tone.frame}`}>
      <span className={`flex items-center justify-between gap-3 font-medium ${tone.label}`}>
        <span>{label}</span>
        {stateLabel ? (
          <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">
            {stateLabel}
          </span>
        ) : null}
      </span>
      {children}
      {hint ? <span className={`text-xs ${tone.hint}`}>{hint}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 ${
        props.className ?? ""
      }`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 ${
        props.className ?? ""
      }`}
    />
  );
}

export function MetricCard({
  label,
  value,
  tone = "text-slate-900",
  caption
}: {
  label: string;
  value: string;
  tone?: string;
  caption?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-3 text-2xl font-semibold ${tone}`}>{value}</p>
      {caption ? <p className="mt-2 text-xs leading-5 text-slate-500">{caption}</p> : null}
    </div>
  );
}

