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
    <html lang="id" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col antialiased relative selection:bg-indigo-100 selection:text-indigo-900 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
