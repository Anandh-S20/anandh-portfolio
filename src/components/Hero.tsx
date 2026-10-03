import Image from "next/image";
import { portfolio } from "@/data/portfolio";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-36 pb-24 sm:pt-44">
      <div
        aria-hidden
        className="animate-fade-in pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]"
      />
      <div className="relative mx-auto max-w-7xl px-5">
        <div className="flex flex-col-reverse items-center gap-10 md:flex-row md:gap-14">
          <div className="min-w-0 flex-1 text-center md:text-left">
            <p className="animate-fade-up font-mono text-sm text-emerald-600 dark:text-emerald-400">
              <span className="text-slate-500">$</span> whoami
            </p>
            <h1 className="animate-fade-up anim-delay-1 mt-4 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
              {portfolio.name}
            </h1>
            <p className="animate-fade-up anim-delay-2 mt-3 text-xl font-medium text-emerald-600 dark:text-emerald-400 sm:text-2xl">
              {portfolio.headline}
            </p>
            <p className="animate-fade-up anim-delay-3 mt-5 max-w-2xl text-lg leading-relaxed text-slate-500 dark:text-slate-400 md:mx-0 mx-auto">
              {portfolio.tagline}
            </p>
            <div className="animate-fade-up anim-delay-4 mt-8 flex flex-wrap justify-center gap-4 md:justify-start">
              <a
                href="#contact"
                className="rounded-md bg-emerald-500 px-6 py-3 font-semibold text-[#0b0f14] transition hover:bg-emerald-400"
              >
                Get in Touch
              </a>
              <a
                href="#experience"
                className="rounded-md border border-slate-300 dark:border-white/15 px-6 py-3 font-semibold text-slate-700 dark:text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                View Experience
              </a>
            </div>
            <div className="animate-fade-up anim-delay-5 mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-sm text-slate-500 md:justify-start">
              <span>📍 {portfolio.location}</span>
              <span>💼 Open to opportunities</span>
            </div>
          </div>
          <div className="animate-fade-in anim-delay-2 shrink-0">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-3 rounded-full bg-emerald-500/20 blur-xl"
              />
              <Image
                src="/profile.jpg"
                alt={portfolio.name}
                width={288}
                height={288}
                priority
                className="relative h-48 w-48 rounded-full border-4 border-emerald-500/70 object-cover shadow-2xl sm:h-56 sm:w-56 md:h-72 md:w-72"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
