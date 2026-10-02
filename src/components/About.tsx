import { portfolio } from "@/data/portfolio";

export default function About() {
  return (
    <section id="about" className="mx-auto max-w-5xl scroll-mt-20 px-5 py-16">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        <span className="text-slate-500">01.</span> About
      </h2>
      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_240px]">
        <p className="text-lg leading-relaxed text-slate-500 dark:text-slate-600 dark:text-slate-300">{portfolio.about}</p>
        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] p-5">
          <h3 className="font-mono text-xs uppercase tracking-widest text-slate-500">
            Languages
          </h3>
          <ul className="mt-3 space-y-2">
            {portfolio.languages.map((l) => (
              <li key={l} className="text-sm text-slate-500 dark:text-slate-600 dark:text-slate-300">
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
