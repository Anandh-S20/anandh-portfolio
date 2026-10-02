import { portfolio } from "@/data/portfolio";

export default function Education() {
  return (
    <section id="education" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-16">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        <span className="text-slate-500">05.</span> Education & Certifications
      </h2>
      <div className="mt-8 space-y-6">
        {portfolio.education.map((e) => (
          <article
            key={e.school}
            className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{e.degree}</h3>
              <span className="font-mono text-xs text-slate-500">{e.period}</span>
            </div>
            <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-300">{e.school}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{e.detail}</p>
          </article>
        ))}
        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] p-6">
          <h3 className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Certifications
          </h3>
          <ul className="mt-4 space-y-2">
            {portfolio.certifications.map((c) => (
              <li key={c} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
