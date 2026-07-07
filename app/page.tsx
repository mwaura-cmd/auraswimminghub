import Link from "next/link";
import { ArrowRight, ShieldCheck, Trophy, Waves, TimerReset, Dumbbell } from "lucide-react";
import { HomeGalleryPreview } from "@/components/home-gallery-preview";
import { MountainBreezeMap } from "@/components/mountain-breeze-map";
import { MotionItem, MotionSection } from "@/components/motion-section";
import { TestimonialsByAge } from "@/components/testimonials-by-age";
import { ParallaxHero } from "@/components/parallax-hero";
import { PROGRAMS } from "@/lib/constants";
import { BILLING_CYCLE_MULTIPLIER, DAILY_RATE_KES, LEARNER_GROUPS, formatKes } from "@/lib/pricing";

export default function Home() {
  return (
    <div className="pb-20">
      <ParallaxHero />

      <MotionSection className="section-shell mt-16 grid gap-4 md:grid-cols-3">
        {[
          { icon: Trophy, title: "Professional Coaching", text: "Certified elite coaches with progressive, age-based curriculum." },
          { icon: ShieldCheck, title: "Safe Hotel Pool Environment", text: "Premium controlled facility with monitored session safety." },
          { icon: Waves, title: "Progress Tracking Portal", text: "Every stroke, score, and attendance record in one smart dashboard." },
        ].map((item) => (
          <MotionItem key={item.title}>
            <article className="glass-card rounded-2xl p-6">
              <item.icon className="mb-4 text-teal-300" />
              <h3 className="text-lg">{item.title}</h3>
              <p className="mt-2 text-sm text-teal-50/75">{item.text}</p>
            </article>
          </MotionItem>
        ))}
      </MotionSection>

      <MotionSection className="section-shell mt-20">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl">Programs</h2>
          <Link href="/book" className="btn-secondary text-sm">
            Book Your Slot
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PROGRAMS.map((program) => (
            <MotionItem key={program}>
              <article className="glass-card rounded-2xl p-6">
                <h3 className="text-xl">{program}</h3>
                <p className="mt-2 text-sm text-teal-50/75">Structured milestones, technique drills, and confidence-building sessions.</p>
                <Link href="/book" className="btn-primary mt-5 inline-flex text-sm">
                  Book Program
                </Link>
              </article>
            </MotionItem>
          ))}
        </div>
      </MotionSection>

      <MotionSection id="pricing" className="section-shell mt-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl">Pricing</h2>
          <p className="text-sm text-teal-100/75">Per learner charges for daily, weekly, and monthly plans.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {LEARNER_GROUPS.map((group) => (
            <MotionItem key={group}>
              <article className="glass-card rounded-2xl p-6">
                <h3 className="text-xl">{group}</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-teal-500/20 bg-black/40 px-3 py-2">
                    <span className="text-teal-100/80">Daily</span>
                    <span className="font-semibold text-teal-50">{formatKes(DAILY_RATE_KES[group])}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-teal-500/20 bg-black/40 px-3 py-2">
                    <span className="text-teal-100/80">Weekly</span>
                    <span className="font-semibold text-teal-50">{formatKes(DAILY_RATE_KES[group] * BILLING_CYCLE_MULTIPLIER.weekly)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-teal-500/20 bg-black/40 px-3 py-2">
                    <span className="text-teal-100/80">Monthly</span>
                    <span className="font-semibold text-teal-50">{formatKes(DAILY_RATE_KES[group] * BILLING_CYCLE_MULTIPLIER.monthly)}</span>
                  </div>
                </div>
              </article>
            </MotionItem>
          ))}
        </div>

        <p className="mt-4 text-xs text-teal-200/70">Weekly is calculated as daily x 7 and monthly is calculated as daily x 30.</p>
      </MotionSection>

      <MotionSection className="section-shell mt-20 grid gap-4 md:grid-cols-3">
        {[
          { step: "01", title: "Choose a Program", icon: Dumbbell },
          { step: "02", title: "Book a Session", icon: TimerReset },
          { step: "03", title: "Start Swimming", icon: Waves },
        ].map((item) => (
          <MotionItem key={item.step}>
            <article className="glass-card rounded-2xl p-6">
              <p className="text-xs tracking-[0.35em] text-teal-300">STEP {item.step}</p>
              <item.icon className="my-5 text-teal-200" />
              <h3 className="text-xl">{item.title}</h3>
            </article>
          </MotionItem>
        ))}
      </MotionSection>

      <MotionSection className="section-shell mt-20 grid gap-4 rounded-3xl border border-teal-500/25 bg-gradient-to-r from-teal-900/20 to-cyan-800/10 p-8 md:grid-cols-4">
        {[
          "500+ Lessons Delivered",
          "All Age Groups Welcome",
          "Certified Instructors",
          "Premium Hotel Pool",
        ].map((stat) => (
          <MotionItem key={stat}>
            <article className="teal-ring rounded-xl bg-black/45 p-4 text-center">
              <p className="text-sm font-medium text-teal-100">{stat}</p>
            </article>
          </MotionItem>
        ))}
      </MotionSection>

      <MotionSection>
        <HomeGalleryPreview />
      </MotionSection>

      <MotionSection id="testimonials">
        <TestimonialsByAge />
      </MotionSection>

      <MotionSection className="section-shell mt-20">
        <div className="rounded-3xl border border-teal-400/30 bg-black/70 px-8 py-16 text-center">
          <h2 className="text-3xl md:text-4xl">Ready To Start Your Swimming Journey?</h2>
          <Link href="/book" className="btn-primary mt-8 inline-flex items-center gap-2">
            Book Your First Lesson <ArrowRight size={16} />
          </Link>
        </div>
      </MotionSection>

      <MotionSection>
        <MountainBreezeMap />
      </MotionSection>
    </div>
  );
}
