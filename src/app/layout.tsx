import "@/app/globals.css";
import { ThemeClient } from "@/components/theme-client";
import { ProvidersAndInitialization } from "@/features/app/providers-and-initialization";
import { Caveat, Geist, Geist_Mono, Patrick_Hand } from "next/font/google";
import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  other: {
    'base:app_id': '698dbac53cbc7aff6d9c6b73',
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  subsets: ["latin"],
  weight: "400",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeClient />
        <meta name="base:app_id" content="698dbac53cbc7aff6d9c6b73" />
        <meta name="talentapp:project_verification" content="d46d89a80da305f2468a7e722199b625893cbda02a83a05966e61a0072370a0fcfb338c80c0ba7d35f9c9ac92525fe27b7c1db29331c5fbc15b2a7e6c836eb54" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${patrickHand.variable} antialiased`}
      >
        <ProvidersAndInitialization>{children}</ProvidersAndInitialization>
      </body>
    </html>
  );
}
