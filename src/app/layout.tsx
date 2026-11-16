import type { Metadata } from "next";
import { Battambang, Inter, JetBrains_Mono } from "next/font/google";
import ThemeProvider from "@/components/shared/ThemeProvider";
import "./globals.css";

const battambang = Battambang({
  variable: "--font-battambang",
  subsets: ["khmer"],
  weight: ["100", "300", "400", "700", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "POS System - Point of Sale",
  description: "Point of Sale Management Terminal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="km"
      className={`${battambang.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
