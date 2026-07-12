"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export function ParallaxHero() {
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -28]);
  const titleScale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);

  return (
    <section className="section-shell relative overflow-hidden rounded-3xl border border-teal-500/25 bg-black/80 px-6 py-24 md:px-14">
      <motion.div style={{ y: backgroundY }} className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.24),_transparent_48%),linear-gradient(110deg,rgba(3,7,18,0.18),rgba(3,7,18,0.94))]" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1530541930197-d86895ce0ff8?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat opacity-35 mix-blend-luminosity" />
      </motion.div>

      <motion.div style={{ y: glowY }} className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
      <motion.div className="pointer-events-none absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-[58vh] max-w-5xl items-center justify-center text-center">
        <motion.h1
          style={{ y: titleY, scale: titleScale }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-4xl text-4xl leading-tight md:text-6xl lg:text-7xl"
        >
          Discover Your Aura In The Water
        </motion.h1>
      </div>
    </section>
  );
}
