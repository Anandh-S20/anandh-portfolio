import { portfolio } from "@/data/portfolio";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-8">
      <p className="text-center font-mono text-xs text-slate-600">
        © {new Date().getFullYear()} {portfolio.name} — built with Next.js & Tailwind CSS
      </p>
    </footer>
  );
}
