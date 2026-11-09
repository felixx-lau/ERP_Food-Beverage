"use client";
import React, { useRef } from "react";
import { usePathname } from "next/navigation";
import useEntranceMotion from "./ui/useEntranceMotion";
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return <PageContent key={usePathname()}>{children}</PageContent>;
}

function PageContent({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEntranceMotion(root);
  return <div ref={root} className="page-content">{children}</div>;
}
