import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SupabaseConfig } from "@/lib/supabase";
import { UnitsProvider } from "@/lib/units";

const TAGLINE = "The fair cost of every kilometre.";
const DESCRIPTION =
  "Compare what it really costs to buy, lease or finance up to four cars in Alberta: price, GST, payments, fuel or electricity, insurance, maintenance and resale.";

export const metadata: Metadata = {
  metadataBase: new URL("https://bus-860-project.vercel.app"),
  title: { default: `Fairdrive — ${TAGLINE}`, template: "%s · Fairdrive" },
  description: `${TAGLINE} ${DESCRIPTION}`,
  applicationName: "Fairdrive",
  openGraph: {
    type: "website",
    siteName: "Fairdrive",
    title: `Fairdrive — ${TAGLINE}`,
    description: DESCRIPTION,
    url: "/",
    locale: "en_CA",
  },
  twitter: { card: "summary", title: `Fairdrive — ${TAGLINE}`, description: DESCRIPTION },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA">
      <body className="flex min-h-screen flex-col antialiased">
        <SupabaseConfig
          url={process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL}
          publishableKey={process.env.SUPABASE_PUBLISHABLE ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
        >
        <UnitsProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-3 focus:py-2">
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </UnitsProvider>
        </SupabaseConfig>
      </body>
    </html>
  );
}
