import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/lib/i18n/config';
import { NextRequest } from 'next/server';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'never' // Clean URLs without /id/ or /en/
});

const authMiddleware = NextAuth(authConfig).auth;

export default async function middleware(request: NextRequest) {
  // Apply i18n middleware first
  const intlResponse = intlMiddleware(request);

  // Then apply auth middleware
  // @ts-ignore - NextAuth middleware typing compatibility
  const authResponse = await authMiddleware(request);

  // Return auth response (which includes redirects if needed)
  return authResponse || intlResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|uploads).*)",
  ],
};
