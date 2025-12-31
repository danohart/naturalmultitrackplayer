import type { Metadata } from "next";
import "./globals.css";
import InstallPrompt from "@/components/ui/InstallPrompt";
import OfflineIndicator from "@/components/ui/OfflineIndicator";
import Navigation from "@/components/ui/Navigation";

export const metadata: Metadata = {
  title: "Natural Mixer",
  description: "Multi-track audio mixer for live performance",
  applicationName: "Natural Mixer",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Natural Mixer",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  themeColor: "#1b294c",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* iOS Specific Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Natural Mixer" />
        
        {/* Prevent iOS from auto-detecting phone numbers */}
        <meta name="format-detection" content="telephone=no" />
        
        {/* Disable zoom on iOS */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className="antialiased">
        <Navigation />
        {children}
        <InstallPrompt />
        <OfflineIndicator />
      </body>
    </html>
  );
}