"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [animKey, setAnimKey] = useState(0);
  const [displayed, setDisplayed] = useState(children);
  const [entering, setEntering] = useState(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Initial mount — trigger enter animation
    setEntering(true);
  }, []);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    // 1. fade out current content (by removing "entering" class)
    setEntering(false);

    // 2. after fade-out completes, swap content and fade in
    const t = setTimeout(() => {
      setDisplayed(children);
      setAnimKey((k) => k + 1);
      // small rAF to ensure DOM updated before re-applying entering
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntering(true));
      });
    }, 150); // must match exit transition duration

    return () => clearTimeout(t);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // sync non-route child updates
  useEffect(() => {
    if (pathname === prevPathname.current) {
      setDisplayed(children);
    }
  }, [children]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      key={animKey}
      style={{
        opacity: entering ? 1 : 0,
        transform: entering ? "translateY(0px)" : "translateY(6px)",
        transition: entering
          ? "opacity 260ms cubic-bezier(0.4, 0, 0.2, 1), transform 260ms cubic-bezier(0.4, 0, 0.2, 1)"
          : "opacity 150ms cubic-bezier(0.4, 0, 1, 1), transform 150ms cubic-bezier(0.4, 0, 1, 1)",
        willChange: "opacity, transform",
      }}
    >
      {displayed}
    </div>
  );
}
