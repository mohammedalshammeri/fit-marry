import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Providers from "@/components/providers";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

export const metadata: Metadata = {
  title: "Fit Marry - Admin Dashboard",
  description: "Administrative panel for Fit Marry application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cn(cairo.className, "min-h-screen bg-background antialiased relative")}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
