import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ScrollToTop } from "@/components/scroll-to-top";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aura Swimming Hub",
  description: "Premium swimming academy platform",
  icons: {
    icon: "/brand-logo.png",
    shortcut: "/brand-logo.png",
    apple: "/brand-logo.png",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const firebasePublicConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "",
  };

  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full aura-bg text-aura-text">
        <Script
          id="firebase-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.__FIREBASE_CONFIG__ = ${JSON.stringify(firebasePublicConfig)};`,
          }}
        />
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col overflow-x-hidden">
            <SiteNavbar />
            <main className="flex-1 pt-24">{children}</main>
            <SiteFooter />
            <ScrollToTop />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
