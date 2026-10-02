import { portfolio } from "@/data/portfolio";

export default function Projects() {
  return (
    <section id="projects" className="mx-auto max-w-5xl scroll-mt-20 px-5 py-16">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        <span className="text-slate-500">03.</span> Featured Projects
      </h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {portfolio.projects.map((p) => (
          <article
            key={p.name}
            className="group flex flex-col rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-emerald-400/40"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl text-emerald-600 dark:text-emerald-400/80">▚</span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-600">~/projects</span>
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white transition group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              {p.name}
            </h3>
            <p className="mt-2 flex-1 leading-relaxed text-slate-500 dark:text-slate-400">{p.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {p.tech.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 font-mono text-xs text-emerald-700 dark:text-emerald-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
