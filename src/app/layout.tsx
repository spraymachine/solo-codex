import type { Metadata } from "next";
import { Barlow_Condensed, Caveat, Geist, JetBrains_Mono } from "next/font/google";
import { AuthGate } from "@/components/auth/auth-gate";
import { SiteHeader } from "@/components/layout/site-header";
import { StoreInitializer } from "@/components/store-initializer";
import { AuthPersonaScope } from "@/components/system/auth-persona-scope";
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

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwriting",
});

export const metadata: Metadata = {
  title: "Solo system",
  description:
    "A private personal operating system for isolated Solo personas, with secure Supabase sync.",
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
      className={`${geist.variable} ${jetbrainsMono.variable} ${barlowCondensed.variable} ${caveat.variable}`}
    >
      <body className="font-sans antialiased">
        <AuthGate>
          <AuthPersonaScope />
          <ThemeSync />
          <StoreInitializer />
          <CloudSync />
          <SystemEffects />
          <div className="relative min-h-[100dvh]">
            <SiteHeader />
            <main className="px-4 pb-16 pt-0 md:px-6">
              <div className="mx-auto max-w-[1480px]">{children}</div>
            </main>
            <DungeonTimerOverlay />
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
