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
      <body className="min-h-screen bg-[#F7F8F5] text-[#202824] flex flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
