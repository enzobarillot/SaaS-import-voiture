"use client";

import { FormEvent } from "react";
import { ACCOUNT_BENEFITS } from "@/lib/reference-data";
import { AuthSession, ProductAccess } from "@/types";
import { Input } from "@/components/form-primitives";

export function AccountPanel({
  session,
  access,
  reportCount,
  email,
  password,
  authMode,
  busy,
  status,
  localHistoryCount,
  importBusy,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onLogout,
  onImportLocal
}: {
  session: AuthSession | null;
  access: ProductAccess;
  reportCount: number;
  email: string;
  password: string;
  authMode: "signin" | "signup";
  busy: boolean;
  status?: string;
  localHistoryCount: number;
  importBusy: boolean;
  onAuthModeChange: (mode: "signin" | "signup") => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onLogout: () => void;
  onImportLocal: () => void;
}) {
  if (session) {
    return (
      <section className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Account</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">{session.user.email}</h2>
            <p className="mt-2 text-sm text-slate-600">{access.label}. {access.historyLabel}.</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900">Signed in</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Cloud reports</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{reportCount}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Plan</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{session.user.planTier === "premium" ? "Premium" : "Free"}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Access</p>
            <p className="mt-2 text-sm font-medium text-slate-700">Save, reopen, share, and export reports from this account.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {localHistoryCount > 0 ? (
            <button type="button" onClick={onImportLocal} disabled={importBusy} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60">
              {importBusy ? "Importing..." : `Import ${localHistoryCount} local ${localHistoryCount === 1 ? "decision" : "decisions"}`}
            </button>
          ) : null}
          <button type="button" onClick={onLogout} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400">Sign out</button>
        </div>
        {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Account foundation</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Save decisions beyond this browser</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">{access.label}</span>
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        {ACCOUNT_BENEFITS.map((benefit) => (
          <p key={benefit} className="rounded-2xl bg-slate-50 px-4 py-3">{benefit}</p>
        ))}
      </div>
      <div className="mt-5 flex gap-2 rounded-full bg-slate-100 p-1">
        <button type="button" onClick={() => onAuthModeChange("signin")} className={`rounded-full px-4 py-2 text-sm font-medium ${authMode === "signin" ? "bg-white text-ink shadow" : "text-slate-500"}`}>Sign in</button>
        <button type="button" onClick={() => onAuthModeChange("signup")} className={`rounded-full px-4 py-2 text-sm font-medium ${authMode === "signup" ? "bg-white text-ink shadow" : "text-slate-500"}`}>Create account</button>
      </div>
      <form
        className="mt-5 space-y-4"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Input type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="you@example.com" />
        <Input type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder="Minimum 8 characters" />
        <button type="submit" disabled={busy} className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {busy ? "Please wait..." : authMode === "signin" ? "Sign in" : "Create free account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">{status ?? access.upsellMessage}</p>
    </section>
  );
}