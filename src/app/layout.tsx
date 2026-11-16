import type { Metadata } from "next";
import localFont from "next/font/local";
import ThemeProvider from "@/components/shared/ThemeProvider";
import "./globals.css";

const khmerOSBattambang = localFont({
  src: [
    {
      path: "../../public/fonts/KhmerOS_battambang.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-battambang",
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
      className={`${khmerOSBattambang.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
