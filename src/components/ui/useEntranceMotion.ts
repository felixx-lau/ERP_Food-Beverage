"use client";

import { RefObject, useEffect } from "react";

/** No hidden pre-animation state: inputs stay usable, even without JS/observers. */
export default function useEntranceMotion(root: RefObject<HTMLDivElement | null>, enabled = true) {
  useEffect(() => {
    const element = root.current;
    if (!enabled || !element || !window.IntersectionObserver || !element.animate) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const seen = new WeakSet<Element>();
    const queued = new WeakSet<Element>();
    const animations = new Set<Animation>();
    const tokens = getComputedStyle(element);
    const duration = parseFloat(tokens.getPropertyValue("--motion-enter")) || 1000;
    const step = parseFloat(tokens.getPropertyValue("--motion-step")) || 100;
    const easing = tokens.getPropertyValue("--ease").trim() || "ease-out";
    const observer = new IntersectionObserver(entries => {
      let order = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting || seen.has(entry.target)) return;
        seen.add(entry.target);
        observer.unobserve(entry.target);
        if (media.matches) return;
        const animation = entry.target.animate([
          { opacity: 0.35, transform: "translateY(16px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration, delay: Math.min(order++, 7) * step, easing, fill: "backwards" });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      });
    }, { threshold: 0.08 });
    const scan = () => {
      const targets = Array.from(element.querySelectorAll<HTMLElement>(
        ":scope > *, .kpi-card, .module-card, .motion-stagger > *, [data-reveal], .surface-card, .glass-2"
      )).filter(target => !target.closest("[hidden], table") && !target.classList.contains("skeleton"));
      targets.forEach(target => {
        // Animate the individual cards rather than both a grid and its cards.
        if (queued.has(target) || targets.some(other => other !== target && target.contains(other))) return;
        queued.add(target);
        observer.observe(target);
      });
    };
    scan();
    const mutation = new MutationObserver(scan);
    mutation.observe(element, { childList: true, subtree: true });
    const reduce = () => { if (media.matches) animations.forEach(animation => animation.cancel()); };
    media.addEventListener("change", reduce);
    return () => {
      observer.disconnect(); mutation.disconnect();
      animations.forEach(animation => animation.cancel());
      media.removeEventListener("change", reduce);
    };
  }, [root, enabled]);
}
