import { NextRequest, NextResponse } from 'next/server';
import { setUserLocale } from '@/services/locale.service';
import { locales } from '@/lib/i18n/config';

export async function POST(request: NextRequest) {
  const { locale } = await request.json();

  if (!locales.includes(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  await setUserLocale(locale);
  return NextResponse.json({ success: true });
}
