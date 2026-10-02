import { portfolio } from "@/data/portfolio";

export default function Skills() {
  return (
    <section id="skills" className="mx-auto max-w-5xl scroll-mt-20 px-5 py-16">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-emerald-400">
        <span className="text-slate-500">04.</span> Skills
      </h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {portfolio.skills.map((g) => (
          <div
            key={g.group}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-6 transition hover:border-emerald-400/40"
          >
            <h3 className="font-mono text-sm font-semibold text-emerald-300">{g.group}</h3>
            <ul className="mt-4 space-y-2">
              {g.items.map((s) => (
                <li key={s} className="flex gap-3 text-sm text-slate-300">
                  <span className="text-emerald-400">▸</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
