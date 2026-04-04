import type { Metadata } from "next";
import "./globals.css";
import { PageTransition } from "@/components/neo/page-transition";

export const metadata: Metadata = {
  title: "ABHA+",
  description:
    "AI-powered public healthcare infrastructure for government hospitals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@1,2&f[]=general-sans@1,2&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
