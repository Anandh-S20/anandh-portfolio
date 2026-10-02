import { portfolio } from "@/data/portfolio";

export default function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-5xl scroll-mt-20 px-5 py-16">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-emerald-400">
        <span className="text-slate-500">06.</span> Contact
      </h2>
      <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center sm:p-10">
        <p className="text-lg text-slate-300">
          Looking for an IT administrator who keeps systems healthy and users
          happy? My inbox is always open.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href={`mailto:${portfolio.email}`}
            className="rounded-md bg-emerald-500 px-6 py-3 font-semibold text-[#0b0f14] transition hover:bg-emerald-400"
          >
            {portfolio.email}
          </a>
          <a
            href={`tel:${portfolio.phone.replace(/\s/g, "")}`}
            className="rounded-md border border-white/15 px-6 py-3 font-semibold text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-400"
          >
            {portfolio.phone}
          </a>
          <a
            href={portfolio.github}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-white/15 px-6 py-3 font-semibold text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-400"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </section>
  );
}
