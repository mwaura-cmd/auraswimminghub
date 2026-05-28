"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

interface MotionSectionProps extends HTMLMotionProps<"section"> {
  children: React.ReactNode;
}

interface MotionItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

const sectionVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function MotionSection({ children, className, ...rest }: MotionSectionProps) {
  return (
    <motion.section
      className={className}
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      data-motion="true"
      {...rest}
    >
      {children}
    </motion.section>
  );
}

export function MotionItem({ children, className, ...rest }: MotionItemProps) {
  return (
    <motion.div className={className} variants={itemVariants} data-motion="true" {...rest}>
      {children}
    </motion.div>
  );
}
