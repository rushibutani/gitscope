import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gitscope-insights.vercel.app"),
  icons: {
    icon: "/icon.svg",
  },
  title: "GitScope — GitHub Developer Insights",
  description:
    "Explore public GitHub profiles through repository, language, contribution, and development activity insights.",
  keywords: [
    "GitHub",
    "Analytics",
    "Developer Profile",
    "Statistics",
    "Contribution Graph",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "GitScope",
    title: "GitScope — GitHub Developer Insights",
    description:
      "Explore public GitHub profiles through repository, language, contribution, and development activity insights.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetBrainsMono.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
