"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TEXTS = [
  "The water is waiting...",
  "Silence the noise. Find your rhythm.",
  "Unlock your true stroke."
];

export function Preloader() {
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    if (sessionStorage.getItem("aura-preloader-done")) {
      setLoading(false);
      return;
    }

    const interval = setInterval(() => {
      setIndex((prev) => {
        if (prev === TEXTS.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setLoading(false);
            sessionStorage.setItem("aura-preloader-done", "true");
          }, 2500); // Hold last text for 2.5s before revealing site
          return prev;
        }
        return prev + 1;
      });
    }, 2800); // Span of ~2.8 seconds per text

    return () => clearInterval(interval);
  }, []);

  if (!isMounted) return null;

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#020817]"
        >
          {/* Animated Deep Water Background */}
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3] 
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(20,184,166,0.15),_transparent_60%)]"
          />

          {/* Minimalist Graphic (Swimmer Silhouette / Water) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="absolute top-[35%] -mt-10 text-teal-500/40"
          >
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <motion.path 
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
                d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"
              />
              <motion.path 
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.3, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
                d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"
              />
              <motion.path 
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.6, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
                d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"
              />
            </svg>
          </motion.div>

          {/* Animated Text Sequence */}
          <div className="relative mt-8 flex h-20 items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.h2
                key={index}
                initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -15, filter: "blur(8px)" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute w-full px-4 text-center font-space-grotesk text-2xl font-light tracking-wide text-teal-50 md:text-3xl lg:text-4xl"
              >
                {TEXTS[index]}
              </motion.h2>
            </AnimatePresence>
          </div>
          
          {/* Subtle Progress Bar */}
          <div className="absolute bottom-16 left-1/2 h-[1px] w-48 -translate-x-1/2 overflow-hidden bg-white/10 sm:w-64">
             <motion.div 
               initial={{ x: "-100%" }}
               animate={{ x: "0%" }}
               transition={{ duration: 8, ease: "linear" }}
               className="h-full w-full bg-teal-400"
             />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
