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
          {/* Top Left: Luminous Royal Blue Mist */}
          <div className="absolute -top-[12%] -left-[10%] w-[58vw] h-[58vw] rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-[90px]" />
          
          {/* Top Right: Electric Violet Ambient Glow */}
          <div className="absolute top-[2%] -right-[12%] w-[52vw] h-[52vw] rounded-full bg-gradient-to-bl from-purple-300/35 via-violet-200/20 to-transparent blur-[95px]" />
          
          {/* Center Left: Soft Periwinkle Breeze */}
          <div className="absolute top-[42%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-indigo-200/30 via-blue-100/20 to-transparent blur-[100px]" />
          
          {/* Bottom Right: Deep Lavender Ambient Glow */}
          <div className="absolute -bottom-[8%] right-[8%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tl from-violet-200/30 via-purple-100/20 to-transparent blur-[90px]" />
        </div>

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
