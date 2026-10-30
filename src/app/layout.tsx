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
      <body className="min-h-screen bg-[#F4F6F3] text-[#151A18] flex flex-col antialiased relative selection:bg-emerald-100 selection:text-emerald-900">
        {/* Ambient Glassmorphism Mesh Gradients (Fixed Background) */}
        <div
          className="fixed inset-0 pointer-events-none -z-10 overflow-hidden"
          aria-hidden="true"
        >
          {/* Top Left: Sage & Forest Mist */}
          <div className="absolute -top-[12%] -left-[10%] w-[58vw] h-[58vw] rounded-full bg-gradient-to-br from-[#DCE8DF]/85 via-[#BDD1C2]/50 to-transparent blur-[85px]" />
          
          {/* Top Right: Warm Royal Gold Ambient */}
          <div className="absolute top-[2%] -right-[12%] w-[52vw] h-[52vw] rounded-full bg-gradient-to-bl from-[#FAF5EB]/95 via-[#F4E7CE]/65 to-transparent blur-[90px]" />
          
          {/* Center Left: Soft Aruna Mint */}
          <div className="absolute top-[42%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-[#E1EDE6]/70 via-[#DCE8DF]/45 to-transparent blur-[100px]" />
          
          {/* Bottom Right: Culinary Amber Glow */}
          <div className="absolute -bottom-[8%] right-[8%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tl from-[#F4E7CE]/55 via-[#E9D2A3]/35 to-transparent blur-[85px]" />
        </div>

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
