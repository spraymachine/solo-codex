import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import { AuthGate } from "@/components/auth/auth-gate";
import { SiteHeader } from "@/components/layout/site-header";
import { StoreInitializer } from "@/components/store-initializer";
import { CloudSync } from "@/components/system/cloud-sync";
import { DungeonTimerOverlay } from "@/components/system/dungeon-timer-overlay";
import { SystemEffects } from "@/components/system/system-effects";
import { ThemeSync } from "@/components/system/theme-sync";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Solo system",
  description:
    "A dual-persona personal operating system for Mani and Harti, with secure Supabase sync.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <AuthGate>
          <ThemeSync />
          <StoreInitializer />
          <CloudSync />
          <SystemEffects />
          <div className="relative min-h-[100dvh]">
            <SiteHeader />
            <main className="px-4 pb-16 pt-8 md:px-6 md:pt-12">
              <div className="mx-auto max-w-[1480px]">{children}</div>
            </main>
            <DungeonTimerOverlay />
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
