'use client';

import { useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { Locale, locales, localeNames } from '@/lib/i18n/config';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  const handleChange = async (newLocale: Locale) => {
    if (newLocale === locale) return;

    startTransition(async () => {
      try {
        await fetch('/api/locale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: newLocale }),
        });
        window.location.reload();
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-gray-500" />
      <div className="flex gap-1">
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => handleChange(loc)}
            disabled={isPending || locale === loc}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              locale === loc
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={localeNames[loc]}
          >
            {loc.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
