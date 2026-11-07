"use client";
import React from "react";
import { usePathname } from "next/navigation";
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return <div key={usePathname()} className="page-content animate-fade-in-up">{children}</div>;
}
