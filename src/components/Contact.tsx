import { portfolio } from "@/data/portfolio";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6L22 7" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="white" strokeWidth={2} aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="white" stroke="none" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.3 0-.5L9.4 8.2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.2-.7.5-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.5 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  );
}

export default function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-16">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        <span className="text-slate-500">06.</span> Contact
      </h2>
      <div className="mt-8 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] p-8 text-center sm:p-10">
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Looking for an IT administrator who keeps systems healthy and users
          happy? My inbox is always open.
        </p>
        <div className="mt-8 flex justify-center gap-8">
          <a
            href={`mailto:${portfolio.email}`}
            aria-label="Send email"
            className="group flex flex-col items-center gap-2"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EA4335] shadow-lg transition-transform group-hover:scale-110">
              <MailIcon />
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Mail</span>
          </a>
          <a
            href={portfolio.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
            className="group flex flex-col items-center gap-2"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A66C2] shadow-lg transition-transform group-hover:scale-110">
              <LinkedInIcon />
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">LinkedIn</span>
          </a>
          <a
            href={portfolio.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram profile"
            className="group flex flex-col items-center gap-2"
          >
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-110"
              style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
            >
              <InstagramIcon />
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Instagram</span>
          </a>
          <a
            href="https://wa.me/918848120533?text=Hi%20Anandh%2C%20I%20saw%20your%20portfolio%20and%20wanted%20to%20connect."
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="group flex flex-col items-center gap-2"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-transform group-hover:scale-110">
              <WhatsAppIcon />
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  );
}
