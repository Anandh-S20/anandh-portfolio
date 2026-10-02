import { portfolio } from "@/data/portfolio";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-36 pb-24 sm:pt-44">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]"
      />
      <div className="relative mx-auto max-w-5xl px-5">
        <p className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
          <span className="text-slate-500">$</span> whoami
        </p>
        <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
          {portfolio.name}
        </h1>
        <p className="mt-3 text-xl font-medium text-emerald-600 dark:text-emerald-400 sm:text-2xl">
          {portfolio.headline}
        </p>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-500 dark:text-slate-400">
          {portfolio.tagline}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#contact"
            className="rounded-md bg-emerald-500 px-6 py-3 font-semibold text-[#0b0f14] transition hover:bg-emerald-400"
          >
            Get in Touch
          </a>
          <a
            href="#experience"
            className="rounded-md border border-slate-300 dark:border-white/15 px-6 py-3 font-semibold text-slate-700 dark:text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-600 dark:hover:text-emerald-600 dark:text-emerald-400"
          >
            View Experience
          </a>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm text-slate-500">
          <span>📍 {portfolio.location}</span>
          <span>💼 Open to opportunities</span>
        </div>
      </div>
    </section>
  );
}
