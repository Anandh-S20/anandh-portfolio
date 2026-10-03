import { portfolio } from "@/data/portfolio";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-36 pb-24 sm:pt-44">
      <div
        aria-hidden
        className="animate-fade-in pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]"
      />
      <div className="relative mx-auto max-w-7xl px-5">
        <p className="animate-fade-up font-mono text-sm text-emerald-600 dark:text-emerald-400">
          <span className="text-slate-500">$</span> whoami
        </p>
        <h1 className="animate-fade-up anim-delay-1 mt-4 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
          {portfolio.name}
        </h1>
        <p className="animate-fade-up anim-delay-2 mt-3 text-xl font-medium text-emerald-600 dark:text-emerald-400 sm:text-2xl">
          {portfolio.headline}
        </p>
        <p className="animate-fade-up anim-delay-3 mt-5 max-w-2xl text-lg leading-relaxed text-slate-500 dark:text-slate-400">
          {portfolio.tagline}
        </p>
        <div className="animate-fade-up anim-delay-4 mt-8 flex flex-wrap gap-4">
          <a
            href="#contact"
            className="rounded-md bg-emerald-500 px-6 py-3 font-semibold text-[#0b0f14] transition hover:bg-emerald-400"
          >
            Get in Touch
          </a>
          <a
            href="/Anandh_S_Resume.docx"
            download="Anandh_S_Resume.docx"
            className="inline-flex items-center gap-2 rounded-md bg-emerald-500/15 px-6 py-3 font-semibold text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-500/25"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M12 3v12.2l4.2-4.2 1.4 1.4L12 18l-5.6-5.6 1.4-1.4L12 15.2V3h0ZM5 20h14v2H5v-2Z" />
            </svg>
            Resume
          </a>
          <a
            href="#experience"
            className="rounded-md border border-slate-300 dark:border-white/15 px-6 py-3 font-semibold text-slate-700 dark:text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            View Experience
          </a>
        </div>
        <div className="animate-fade-up anim-delay-5 mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm text-slate-500">
          <span>📍 {portfolio.location}</span>
          <span>💼 Open to opportunities</span>
        </div>
      </div>
    </section>
  );
}
