import Link from "next/link";
import { MessageCircle, Music2 } from "lucide-react";

const SOCIAL_LINKS = [
  {
    label: "WhatsApp",
    href: "https://wa.me/254741959888",
    icon: MessageCircle,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@auraswimminghub",
    icon: Music2,
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-teal-500/20 bg-black/75 py-10">
      <div className="section-shell grid gap-6 md:grid-cols-3">
        <div>
          <p className="font-heading text-sm tracking-[0.25em] text-teal-300">AURA SWIMMING HUB</p>
          <p className="mt-3 text-sm text-teal-50/70">Mountain Breeze Hotel, Embu</p>
          <a href="tel:0741959888" className="text-sm text-teal-50/70 hover:text-teal-100">
            0741959888
          </a>
        </div>
        <div>
          <h3 className="text-sm tracking-[0.2em] text-teal-200">Connect</h3>
          <div className="mt-3 space-y-2 text-sm">
            <a href="tel:0741959888" className="block text-teal-50/70 hover:text-teal-100">
              Call: 0741959888
            </a>

            <div className="flex flex-wrap gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${social.label}`}
                  className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-50/85 transition hover:bg-teal-500/20 hover:text-teal-50"
                >
                  <social.icon className="h-3.5 w-3.5" />
                  <span>{social.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm tracking-[0.2em] text-teal-200">Quick Links</h3>
          <div className="mt-3 flex flex-col gap-1 text-sm">
            <Link href="/book" className="text-teal-50/70 hover:text-teal-100">
              Book a Lesson
            </Link>
            <Link href="/portal" className="text-teal-50/70 hover:text-teal-100">
              Learner Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
