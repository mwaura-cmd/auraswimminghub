"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SELECTORS = [
  "section",
  "article",
  ".glass-card",
  ".teal-ring",
  ".aura-testimonial-card",
  ".btn-primary",
  ".btn-secondary",
];

const SKIP_SELECTOR = "[data-reveal='false'], [data-motion='true']";

function addRevealClasses(elements: HTMLElement[]) {
  const grouped = new Map<HTMLElement, HTMLElement[]>();

  for (const element of elements) {
    const parent = element.parentElement;
    if (!parent) {
      continue;
    }
    const list = grouped.get(parent) ?? [];
    list.push(element);
    grouped.set(parent, list);
  }

  grouped.forEach((list) => {
    list.forEach((element, index) => {
      if (!element.classList.contains("reveal-on-scroll")) {
        element.classList.add("reveal-on-scroll");
      }

      if (!element.style.getPropertyValue("--reveal-delay")) {
        const delay = Math.min(index * 60, 240);
        element.style.setProperty("--reveal-delay", `${delay}ms`);
      }
    });
  });
}

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const elements = Array.from(document.querySelectorAll(REVEAL_SELECTORS.join(",")))
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .filter((node) => !node.matches(SKIP_SELECTOR) && !node.closest(SKIP_SELECTOR));

    if (elements.length === 0) {
      return;
    }

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    addRevealClasses(elements);

    if (prefersReduced || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("reveal-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, activeObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const target = entry.target as HTMLElement;
          target.classList.add("reveal-visible");
          activeObserver.unobserve(target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
