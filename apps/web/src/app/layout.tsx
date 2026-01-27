import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/Toaster";
import { AuthErrorBoundary } from "@/components/AuthErrorBoundary";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "OpenChat PWA",
  description: "Open-Source, Cross-Platform Progressive Web App for Modern Social Communication",
  manifest: `${process.env.STATIC_EXPORT === 'true' ? '/openchat-pwa' : ''}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OpenChat PWA",
  },
  icons: {
    apple: `${process.env.STATIC_EXPORT === 'true' ? '/openchat-pwa' : ''}/icons/icon-192x192.png`,
    icon: `${process.env.STATIC_EXPORT === 'true' ? '/openchat-pwa' : ''}/icons/icon-192x192.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem('darkMode');var prefers=window.matchMedia('(prefers-color-scheme: dark)').matches;var shouldDark=stored==='enabled'||(!stored&&prefers);document.documentElement.classList.toggle('dark',shouldDark);}catch(e){}})();`,
          }}
        />
        <link rel="manifest" href={`${process.env.STATIC_EXPORT === 'true' ? '/openchat-pwa' : ''}/manifest.json`} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OpenChat PWA" />
        <meta name="application-name" content="OpenChat PWA" />
        <meta name="msapplication-TileColor" content="#10b981" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body
        className={`font-inter antialiased bg-gray-50 dark:bg-gray-900`}
        suppressHydrationWarning
      >
        <AuthErrorBoundary>
          {children}
        </AuthErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
