import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/components/layouts/SessionWrapper";
import { NextIntlClientProvider } from 'next-intl';
import { getUserLocale } from '@/services/locale.service';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SmartResidence - IPL Management System",
  description: "Housing payment (IPL) management application for residential areas",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getUserLocale();
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionWrapper>{children}</SessionWrapper>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
