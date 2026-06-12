"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TEXTS = [
  "BREATHE.",
  "FEEL THE PULL.",
  "FIND YOUR AURA."
];

export function Preloader() {
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Bypass if already seen this session
    if (sessionStorage.getItem("aura-cinematic-preloader-done")) {
      setLoading(false);
      return;
    }

    const interval = setInterval(() => {
      setIndex((prev) => {
        if (prev === TEXTS.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setLoading(false);
            sessionStorage.setItem("aura-cinematic-preloader-done", "true");
          }, 2500);
          return prev;
        }
        return prev + 1;
      });
    }, 2800); // Max 3s constraint: 2.8s

    return () => clearInterval(interval);
  }, []);

  if (!isMounted) return null;

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="cinematic-preloader"
          initial={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.5, filter: "blur(25px)" }} // Massive zoom-through effect
          transition={{ duration: 1.6, ease: [0.76, 0, 0.24, 1] }} 
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-black"
        >
          {/* SVG Filter for Liquid Distortion Effect */}
          <svg className="hidden">
            <filter id="liquid">
              <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </svg>

          {/* Cinematic Underwater Swimmer Image (Unsplash) */}
          <motion.div 
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1.15, opacity: 0.6 }}
            transition={{ duration: 8, ease: "easeOut" }}
            className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1530541930197-d86895ce0ff8?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat"
          />
          
          {/* Deep Abyss Vignette and Overlay Gradients for Depth */}
          <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#000000_100%)] opacity-90" />
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-transparent to-black" />

          {/* Enormous Background Typography (Ghost Outline) */}
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-30 mix-blend-overlay">
             <motion.h1 
               initial={{ letterSpacing: "-0.05em", scale: 0.95 }}
               animate={{ letterSpacing: "0.15em", scale: 1.05 }}
               transition={{ duration: 9, ease: "easeOut" }}
               className="font-space-grotesk text-[30vw] font-black uppercase leading-none text-transparent"
               style={{ WebkitTextStroke: "1px rgba(255,255,255,0.4)" }}
             >
                AURA
             </motion.h1>
          </div>

          {/* Focal Text Sequence with Liquid Blur */}
          <div className="relative z-10 flex h-40 w-full items-center justify-center px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40, filter: "url(#liquid) blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -40, filter: "url(#liquid) blur(10px)", scale: 1.05 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-center font-space-grotesk text-3xl font-light tracking-[0.2em] text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] md:text-5xl lg:text-7xl"
              >
                {TEXTS[index]}
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Sleek Understated Progress Indicator */}
          <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 flex-col items-center gap-5">
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.8, duration: 1 }}
               className="text-[10px] uppercase tracking-[0.5em] text-white/50"
             >
                Entering deep water
             </motion.div>
             <div className="h-[1px] w-64 overflow-hidden bg-white/10 md:w-80">
               <motion.div 
                 initial={{ x: "-100%" }}
                 animate={{ x: "0%" }}
                 transition={{ duration: 8.4, ease: "linear" }}
                 className="h-full w-full bg-teal-400"
                 style={{
                   boxShadow: "0 0 20px 2px rgba(45, 212, 191, 0.6)"
                 }}
               />
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
