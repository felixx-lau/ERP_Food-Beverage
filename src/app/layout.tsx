import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "PT Rasa Aruna Bersama — Rasa Aruna Kitchen ERP",
  description: "Enterprise ERP System for PT Rasa Aruna Bersama (Food & Beverage)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col antialiased relative selection:bg-indigo-100 selection:text-indigo-900 font-sans">
        {/* Ambient Glassmorphism Mesh Gradients: Luminous Royal Blue & Violet/Purple Orbs */}
        <div
          className="fixed inset-0 pointer-events-none -z-10 overflow-hidden"
          aria-hidden="true"
        >
          {/* Top Left: Subtle Royal Blue Mist */}
          <div className="absolute -top-[15%] -left-[10%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-br from-blue-200/20 via-indigo-100/15 to-transparent blur-[120px]" />
          {/* Bottom Right: Subtle Violet Glow */}
          <div className="absolute -bottom-[10%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-violet-200/20 via-purple-100/12 to-transparent blur-[120px]" />
        </div>

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
