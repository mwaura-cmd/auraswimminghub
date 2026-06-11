import Link from "next/link";
import { ArrowRight, ShieldCheck, Trophy, Waves, TimerReset, Dumbbell, MapPin, Star } from "lucide-react";
import * as motion from "framer-motion/client";
import { HomeGalleryPreview } from "@/components/home-gallery-preview";
import { MountainBreezeMap } from "@/components/mountain-breeze-map";
import { MotionItem, MotionSection } from "@/components/motion-section";
import { TestimonialsByAge } from "@/components/testimonials-by-age";
import { PROGRAMS } from "@/lib/constants";
import { BILLING_CYCLE_MULTIPLIER, DAILY_RATE_KES, LEARNER_GROUPS, formatKes } from "@/lib/pricing";

export default function Home() {
  return (
    <div className="pb-20">
      {/* 
        Aesthetic Cinematic Hero Section 
        (Full screen presence, rich typography, depth layers, dynamic badges)
      */}
      <section className="relative flex min-h-[92vh] w-full flex-col justify-end overflow-hidden px-6 pb-20 pt-40 md:min-h-screen md:px-14 md:pb-32">
        
        {/* Deep Cinematic Background */}
        <div className="absolute inset-0 z-0 select-none">
          <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519330953047-8a6db9e925b3?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat mix-blend-luminosity"
          />
          {/* Gradient masking for smooth fade into the rest of the site */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent" />
          
          {/* Subtle teal atmospheric glow */}
          <div className="absolute -top-[20%] right-[10%] h-[600px] w-[600px] rounded-full bg-teal-500/10 blur-[100px]" />
          <div className="absolute -bottom-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-teal-800/20 blur-[120px]" />
        </div>

        {/* Floating Abstract Element (Like water ripples) */}
        <div className="pointer-events-none absolute right-[5%] top-[25%] z-0 hidden lg:block">
          <motion.div
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
            className="text-teal-500/10"
          >
            <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,95.5,-3C94.2,12,85.6,26,75,37.3C64.4,48.6,51.8,57.2,38.3,64C24.8,70.8,10.4,75.8,-4.2,83.1C-18.8,90.4,-33.6,100,-46.8,95.5C-60,91,-71.6,72.4,-77.8,54.8C-84,37.2,-84.8,20.6,-82.5,5.2C-80.2,-10.2,-74.8,-24.4,-67.2,-37.1C-59.6,-49.8,-50,-61,-37.8,-69.4C-25.6,-77.8,-10.8,-83.4,2.8,-88.4C16.4,-93.4,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
            </svg>
          </motion.div>
        </div>

        {/* Premium Content Stack */}
        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="mb-6 flex flex-wrap items-center gap-3"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/40 py-1.5 pl-2 pr-4 text-xs font-medium text-teal-200 backdrop-blur-md">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500">
                <MapPin size={12} className="text-teal-950" />
              </span>
              Mountain Breeze Hotel, Embu
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span>Elite Training</span>
            </div>
          </motion.div>

          <div className="max-w-4xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="font-space-grotesk text-5xl font-medium tracking-tight text-white sm:text-6xl md:text-[5.5rem] md:leading-[1.05]"
            >
              Master The <br className="hidden md:block"/>
              <span className="bg-gradient-to-r from-teal-300 via-teal-100 to-white bg-clip-text text-transparent italic pr-2">Fluidity</span> Within.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="mt-6 max-w-2xl text-lg font-light leading-relaxed text-slate-300 md:text-xl"
            >
              Elevate your technique, build unshakable confidence, and conquer the water with world-class coaching designed for the modern swimmer.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="mt-10 flex flex-wrap items-center gap-5"
            >
              <Link 
                href="/book" 
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-teal-400 px-8 py-4 font-space-grotesk text-sm font-semibold tracking-wide text-teal-950 transition-all hover:bg-teal-300 hover:shadow-[0_0_20px_rgba(45,212,191,0.3)]"
              >
                <span>Book Your Session</span>
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link 
                href="/programs" 
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-transparent px-8 py-4 font-space-grotesk text-sm font-medium tracking-wide text-white transition-all hover:bg-white/10 hover:border-white/40"
              >
                Explore Programs
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Scrolling Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-10 left-6 hidden items-center gap-4 text-xs font-medium tracking-widest text-slate-500 uppercase md:flex lg:left-14"
        >
          <span className="-rotate-90">Scroll</span>
          <div className="h-16 w-[1px] overflow-hidden bg-white/10">
             <motion.div 
               animate={{ y: ["-100%", "200%"] }}
               transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
               className="h-1/2 w-full bg-teal-500"
             />
          </div>
        </motion.div>
      </section>

      {/* Main Extracted Details Overlay (Sleek floating stats bar) */}
      <div className="relative z-20 mx-auto -mt-10 mb-20 max-w-7xl px-4 sm:-mt-16 md:px-6">
        <MotionSection 
          viewport={{ once: true }} 
          className="grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl md:grid-cols-3"
        >
          {[
            { icon: Trophy, title: "Elite Coaching", text: "Curriculum backed by science." },
            { icon: ShieldCheck, title: "Controlled Safety", text: "Monitored premium facility." },
            { icon: Waves, title: "Digital Tracker", text: "Every session logged instantly." },
          ].map((item, i) => (
            <div key={item.title} className={`bg-slate-950/80 p-6 md:p-8 hover:bg-slate-950/60 transition-colors ${i !== 0 ? "hidden md:block" : ""}`}>
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-3 text-teal-300">
                  <item.icon size={20} />
                </div>
                <div>
                  <h3 className="font-space-grotesk text-lg font-medium text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{item.text}</p>
                </div>
              </div>
            </div>
          ))}
        </MotionSection>
      </div>

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
