import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { ScrapeButton } from "@/components/nav/scrape-button";
import { Sidebar } from "@/components/nav/sidebar";
import { CountrySelector } from "@/components/nav/country-selector";
import { FiatProvider } from "@/components/providers/fiat-provider";
import { getActiveFiat } from "@/lib/fiat-cookie";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAuthPage = pathname === "/login";
  const initialFiat = isAuthPage ? "RWF" : await getActiveFiat();

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body
        className={
          isAuthPage
            ? "h-screen w-screen bg-background text-foreground font-sans"
            : "h-screen w-screen overflow-hidden flex bg-background text-foreground font-sans"
        }
      >
        {isAuthPage ? (
          children
        ) : (
          <FiatProvider initialFiat={initialFiat}>
            {/* Lien d'évitement pour l'accessibilité clavier */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:shadow-lg focus:font-bold focus:outline-none"
            >
              Passer au contenu principal
            </a>

            {/* Sidebar - Positionnée latéralement */}
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Barre supérieure - Informations de trading */}
              <header className="h-14 border-b border-border bg-card flex items-center shrink-0 px-6 justify-between select-none">
                <div className="flex items-center gap-6 overflow-hidden">
                  <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-white shrink-0">
                    <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-primary-foreground font-mono text-[10px]" aria-hidden="true">
                      P2P
                    </div>
                    Analyzer
                  </div>

                  <div className="h-4 w-px bg-border mx-2 hidden md:block" aria-hidden="true" />

                  <div className="flex items-center gap-4 text-xs font-medium overflow-hidden">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">Paire :</span>
                      <span className="text-white">USDT / FIAT</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">Réseau :</span>
                      <span className="text-success flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
                        Binance
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CountrySelector />
                  <div className="h-8 w-px bg-border mx-1" aria-hidden="true" />
                  <ScrapeButton />
                  <div className="h-8 w-px bg-border mx-1" aria-hidden="true" />
                  <form action="/api/logout" method="POST">
                    <button
                      type="submit"
                      className="h-8 w-8 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground font-bold border border-border hover:bg-secondary/80 hover:text-foreground transition-colors cursor-pointer"
                      aria-label="Se déconnecter"
                      title="Se déconnecter"
                    >
                      L
                    </button>
                  </form>
                </div>
              </header>

              {/* Zone de contenu principal */}
              <div className="flex-1 overflow-y-auto bg-background/50">
                <main id="main-content" className="w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 outline-none">
                  {children}
                </main>
              </div>
            </div>
          </FiatProvider>
        )}
      </body>
    </html>
  );
}
