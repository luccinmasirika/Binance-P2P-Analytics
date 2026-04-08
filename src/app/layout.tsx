import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ScrapeButton } from "@/components/nav/scrape-button";
import { Sidebar } from "@/components/nav/sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "P2P Analyzer - Binance USDT",
  description: "Analyse du marche P2P Binance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-screen w-screen overflow-hidden flex bg-background text-foreground font-sans">
        
        {/* Sidebar - Binance Style Navigation */}
        <Sidebar className="hidden lg:flex w-64 shrink-0 border-r border-border bg-card" />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar - Functional Trading Pairs Status */}
          <header className="h-14 border-b border-border bg-card flex items-center shrink-0 px-6 justify-between">
            <div className="flex items-center gap-6 overflow-hidden">
              <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-white shrink-0">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-primary-foreground font-mono text-[10px]">
                  P2P
                </div>
                Analyzer
              </div>
              
              <div className="h-4 w-px bg-border mx-2 hidden md:block" />
              
              <div className="flex items-center gap-4 text-xs font-medium overflow-hidden">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">Pair:</span>
                  <span className="text-white">USDT / FIAT</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="text-success flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Binance
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ScrapeButton />
              <div className="h-8 w-px bg-border mx-2" />
              <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground font-bold border border-border">
                L
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto bg-background/50">
            <main className="w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
