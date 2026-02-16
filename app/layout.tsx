import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Tour Analytics Dashboard",
  description: "Аналитический дашборд для учёта и статистики экскурсий",
  keywords: ["dashboard", "analytics", "tours", "excursions", "statistics"],
  openGraph: {
    title: "Tour Analytics Dashboard",
    description: "Аналитический дашборд для учёта и статистики экскурсий",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`} suppressHydrationWarning>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            classNames: {
              toast: 'font-sans',
              title: 'font-medium',
              description: 'text-sm',
            },
          }}
        />
      </body>
    </html>
  );
}
