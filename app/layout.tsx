import { DataProvider } from "@/components/providers/DataProvider";
import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://dineflow-demo.example"),
  title: {
    default: "DineFlow — Lumina Kitchen Demo",
    template: "%s | DineFlow",
  },
  description:
    "DineFlow is a fictional portfolio demo of a restaurant management system for Lumina Kitchen — menu, orders, kitchen, billing, and guest ordering in the browser.",
  applicationName: "DineFlow",
  authors: [{ name: "DineFlow Demo" }],
  openGraph: {
    title: "DineFlow — Lumina Kitchen Demo",
    description:
      "Portfolio restaurant management demo with public ordering and ops dashboards. Fictional data · LocalStorage only.",
    type: "website",
    siteName: "DineFlow",
  },
  twitter: {
    card: "summary_large_image",
    title: "DineFlow — Lumina Kitchen Demo",
    description:
      "Fictional restaurant SaaS portfolio demo. Not a production restaurant system.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
