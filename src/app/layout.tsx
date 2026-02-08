import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Relaks - Wellness Coloring Community",
  description: "Share your colored pages, find inspiration, and build wellness habits with the Relaks community.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Relaks",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Relaks",
    title: "Relaks - Wellness Coloring Community",
    description: "Share your colored pages, find inspiration, and build wellness habits with the Relaks community.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Relaks - Wellness Coloring Community",
    description: "Share your colored pages, find inspiration, and build wellness habits with the Relaks community.",
  },
};

export const viewport: Viewport = {
  themeColor: "#A855F7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${plusJakarta.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
