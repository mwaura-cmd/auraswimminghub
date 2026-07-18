"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function ParallaxHero() {
  const { scrollYProgress } = useScroll();
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 36]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -18]);
  const accentY = useTransform(scrollYProgress, [0, 1], [0, -42]);

  return (
    <section className="section-shell relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#08376b] px-3 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_80px_rgba(1,8,24,0.45)] sm:px-4 sm:py-4 md:px-6 md:py-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_82%_92%,rgba(34,211,238,0.16),transparent_20%),linear-gradient(180deg,rgba(10,52,104,0.8),rgba(3,32,69,0.98))]" />
      <motion.div style={{ y: accentY }} className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl md:h-72 md:w-72" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_30%,transparent_70%,rgba(255,255,255,0.02))]" />
      </div>

      <div className="relative grid gap-4 md:min-h-[74vh] md:grid-cols-[1.08fr_0.92fr] md:gap-8 lg:min-h-[78vh]">
        <motion.div
          style={{ y: imageY }}
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-white/70 bg-slate-950 shadow-[0_16px_60px_rgba(1,8,24,0.4)] sm:aspect-[16/13] md:aspect-auto md:h-full"
        >
          <div className="absolute inset-0 bg-[url('https://commons.wikimedia.org/wiki/Special:FilePath/Phelps4x100.jpg')] bg-cover bg-center bg-no-repeat" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.35),transparent_28%),linear-gradient(180deg,rgba(5,34,69,0.08),rgba(1,18,37,0.6))]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent_26%,transparent_72%,rgba(255,255,255,0.02))]" />
          <div className="absolute inset-0 rounded-[1.5rem] ring-1 ring-white/40 ring-inset" />
        </motion.div>

        <div className="relative flex items-center justify-center px-1 py-2 text-center md:px-4 md:py-6 md:text-left">
          <motion.div
            style={{ y: titleY }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut", delay: 0.05 }}
            className="max-w-xl"
          >
            <p className="text-xs font-medium uppercase tracking-[0.26em] text-white/90 sm:text-sm md:text-base">
              Aura Swimming Hub
            </p>
            <h1 className="mt-4 text-[2.8rem] leading-[0.95] text-cyan-300 sm:text-5xl md:mt-5 md:text-6xl lg:text-7xl xl:text-[5.35rem]">
              Dive Into
              <span className="block text-cyan-200">Greatness</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-cyan-50/80 sm:mt-6 sm:leading-7 md:mx-0 md:text-base">
              Premium coaching, structured progress, and a calm pool environment built for confident swimmers of every age.
            </p>
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center md:items-start">
              <Link href="/book" className="btn-primary inline-flex w-full items-center justify-center gap-2 text-sm sm:w-auto">
                Book a Session <ArrowRight size={16} />
              </Link>
              <Link href="/programs" className="rounded-full border border-cyan-200/60 bg-white/5 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-white/90 hover:bg-white/10 sm:w-auto sm:self-auto">
                Explore Programs
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 0.18, ease: "easeOut" }}
        className="pointer-events-none absolute bottom-2 right-2 hidden md:block"
      >
        <svg width="240" height="120" viewBox="0 0 240 120" fill="none" aria-hidden="true">
          <path d="M0 120C28 96 48 90 72 84C108 75 140 72 180 56C205 46 222 32 240 14" stroke="rgba(34,211,238,0.8)" strokeWidth="2" />
          <path d="M12 120C38 100 59 95 84 88C118 79 150 75 188 60C210 52 226 40 240 25" stroke="rgba(103,232,249,0.72)" strokeWidth="2" />
          <path d="M24 120C46 104 68 99 92 92C126 82 158 79 194 64C214 56 229 46 240 35" stroke="rgba(34,211,238,0.52)" strokeWidth="2" />
        </svg>
      </motion.div>
    </section>
  );
}
