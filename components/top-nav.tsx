"use client";

export function TopNav({ onStart }: { onStart: () => void }) {
  const navItems = [
    { label: "Simulator", href: "#simulator" },
    { label: "Pricing", href: "#pricing" },
    { label: "Reports", href: "#reports" },
    { label: "Account", href: "#account" }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 md:px-10 lg:px-16">
        <a href="#top" className="text-sm font-semibold tracking-tight text-ink">ImportScore</a>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-ink">{item.label}</a>
          ))}
        </nav>
        <button type="button" onClick={onStart} className="hidden rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 md:inline-flex">
          Start
        </button>
        <details className="relative md:hidden">
          <summary className="list-none rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Menu</summary>
          <div className="absolute right-0 mt-3 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
            <div className="grid gap-1">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">{item.label}</a>
              ))}
              <button type="button" onClick={onStart} className="mt-1 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white">Start</button>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}