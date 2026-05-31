import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Navigation } from "@/components/Navigation";
import { OfflineBanner } from "@/components/OfflineBanner";
import { APIProvider } from "@vis.gl/react-google-maps";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RoadSoS",
  description: "Offline-first emergency response",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#121212",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col`}>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
          <OfflineBanner />
          <main className="flex-1 pb-16">
            {children}
          </main>
          <Navigation />
          <Toaster />
        </APIProvider>
      </body>
    </html>
  );
}
