import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PocketLP - Smart Round-Up Investing",
  description: "Transform your spare change into DeFi yields with our twin-agent system. Secure, automated, and intelligent investing powered by Solana.",
  keywords: ["defi", "investing", "round-up", "yield", "solana", "crypto", "savings"],
  authors: [{ name: "PocketLP Team" }],
  creator: "PocketLP",
  publisher: "PocketLP",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://pocketlp.app"),
  openGraph: {
    title: "PocketLP - Smart Round-Up Investing",
    description: "Transform your spare change into DeFi yields with our twin-agent system.",
    url: "https://pocketlp.app",
    siteName: "PocketLP",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "PocketLP - Smart DeFi Investing",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PocketLP - Smart Round-Up Investing",
    description: "Transform your spare change into DeFi yields with our twin-agent system.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PocketLP",
    startupImage: [
      "/apple-touch-icon.png",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0066FF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#0066FF" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-inter antialiased bg-gray-50 text-gray-900 overflow-x-hidden`}
      >
        <div id="root" className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
