import type { Metadata } from "next";
import { Poppins, Baloo_2 } from "next/font/google";
import "./globals.css";

import { AppProviders } from "@/components/providers/app-providers";

const poppins = Poppins({
  variable: "--font-wordnest-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const baloo = Baloo_2({
  variable: "--font-wordnest-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WordNest – Learn English Through Stories",
  description:
    "WordNest is a playful, story-based platform that helps Hungarian learners grow their English vocabulary through AI-generated adventures.",
  openGraph: {
    title: "WordNest – Learn English Through Stories",
    description:
      "Discover personalized English stories, vocabulary tooltips, and teacher dashboards in WordNest.",
    url: "https://wordnest.hu",
    siteName: "WordNest",
    locale: "hu_HU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WordNest – Learn English Through Stories",
    description:
      "Personalized English stories with Hungarian translations and progress tracking.",
  },
  metadataBase: new URL("https://wordnest.hu"),
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body
        className={`${poppins.variable} ${baloo.variable} antialiased bg-background text-foreground`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
