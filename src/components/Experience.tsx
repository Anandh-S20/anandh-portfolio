import { portfolio } from "@/data/portfolio";

export default function Experience() {
  return (
    <section id="experience" className="mx-auto max-w-5xl scroll-mt-20 px-5 py-16">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        <span className="text-slate-500">02.</span> Experience
      </h2>
      <div className="mt-8 space-y-6">
        {portfolio.experience.map((job) => (
          <article
            key={job.company + job.role}
            className="group rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] p-6 transition hover:border-emerald-400/40 sm:p-7"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {job.role}
                <span className="text-emerald-600 dark:text-emerald-400"> @ {job.company}</span>
              </h3>
              <span className="font-mono text-xs text-slate-500">{job.period}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{job.location}</p>
            <ul className="mt-4 space-y-2.5">
              {job.points.map((p) => (
                <li key={p} className="flex gap-3 text-slate-600 dark:text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
