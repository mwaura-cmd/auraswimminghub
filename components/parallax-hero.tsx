"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, MapPin, Sparkles, Waves } from "lucide-react";

export function ParallaxHero() {
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -48]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -28]);
  const titleScale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);

  return (
    <section className="section-shell relative overflow-hidden rounded-3xl border border-teal-500/25 bg-black/80 px-6 py-24 md:px-14">
      <motion.div style={{ y: backgroundY }} className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.24),_transparent_48%),linear-gradient(110deg,rgba(3,7,18,0.18),rgba(3,7,18,0.94))]" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1530541930197-d86895ce0ff8?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat opacity-35 mix-blend-luminosity" />
      </motion.div>

      <motion.div style={{ y: glowY }} className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
      <motion.div style={{ y: cardY }} className="pointer-events-none absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="relative mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-5 flex flex-wrap items-center gap-3"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/60 px-3 py-1.5 text-xs font-medium text-teal-100 backdrop-blur-md">
              <MapPin size={12} />
              Mountain Breeze Hotel, Embu
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur-md">
              <Sparkles size={12} className="text-teal-300" />
              Premium aquatic training
            </div>
          </motion.div>

          <motion.div style={{ y: titleY, scale: titleScale }} className="max-w-3xl">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="max-w-4xl text-4xl leading-tight md:text-6xl"
            >
              Discover Your Aura In The Water
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="mx-auto mt-5 max-w-2xl text-base text-teal-50/80 md:mx-0 md:text-lg"
            >
              Professional swimming lessons for kids, teens, and adults at Mountain Breeze Hotel, Embu.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link className="btn-primary inline-flex items-center gap-2" href="/book">
              Book a Class <ArrowRight size={16} />
            </Link>
            <Link className="btn-secondary" href="/programs">
              View Programs
            </Link>
            <Link className="btn-secondary bg-teal-500/20 text-teal-50 border-teal-500/30 hover:bg-teal-500/30" href="/login">
              Login to Portal
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
          className="glass-card relative overflow-hidden rounded-3xl border border-teal-400/20 p-5 shadow-2xl shadow-black/40"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.16),_transparent_60%)]" />
          <div className="relative space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-[0.32em] text-teal-300">Live vibe</p>
              <p className="mt-2 text-xl text-teal-50">Fast, focused, and built for confidence in the pool.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Technique-first sessions",
                "Beginner-safe progression",
                "Timetabled coaching blocks",
                "Learner dashboard tracking",
              ].map((label) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-teal-50/80 transition hover:border-teal-400/40 hover:bg-teal-500/10">
                  {label}
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-teal-500/20 bg-black/50 p-4">
              <div className="flex items-center gap-2 text-sm text-teal-200">
                <Waves size={16} />
                Smooth motion, stronger presence, better conversions.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
