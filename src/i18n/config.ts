/* =========================================================================
   BILINGUAL ARCHITECTURE
   =========================================================================

   DESIGN DECISION — why parallel prefixed routes, not a client-side toggle:

   1. Both languages get real, indexable, shareable URLs. A Mandarin-speaking
      parent can send /zh/visit to a friend and it opens in Chinese.
   2. Google can index both and serve the right one (hreflang + sitemap).
   3. No flash of the wrong language, no JS required to read the site.
   4. `prefixDefaultLocale: true` means English is *not* privileged — there is
      no bare /about that implies English is the "real" site.

   DESIGN DECISION — why content is ONE file with paired fields, not two files:

   A church volunteer creating a Mid-Autumn Festival event should create ONE
   event, not two that can silently drift apart. The date, time, location,
   photo and expiry are shared; only the prose differs. This makes an
   orphaned or contradictory translation structurally impossible, which is
   exactly the failure mode that makes bilingual church sites rot.

   Where a translation genuinely does not exist yet, the field is left empty
   and the UI degrades honestly (see `pick()` below) rather than showing a
   blank space or machine-translated filler.
   ========================================================================= */

export const LOCALES = ['en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_META: Record<
  Locale,
  {
    /** BCP-47 tag for <html lang> and hreflang */
    tag: string;
    /** How this language names itself — always shown in its own script */
    endonym: string;
    /** Short label for the switcher */
    short: string;
    dir: 'ltr';
    ogLocale: string;
    /** Intl locale for dates */
    intl: string;
  }
> = {
  en: {
    tag: 'en-US',
    endonym: 'English',
    short: 'EN',
    dir: 'ltr',
    ogLocale: 'en_US',
    intl: 'en-US',
  },
  zh: {
    tag: 'zh-CN',
    endonym: '中文',
    short: '中文',
    dir: 'ltr',
    ogLocale: 'zh_CN',
    intl: 'zh-CN',
  },
};

/** A value that exists in both languages. */
export type Bilingual = { en: string; zh: string };

/**
 * Resolve a bilingual value for a locale.
 *
 * If the requested language is missing, fall back to the other one rather
 * than rendering an empty element — but the caller can detect this via
 * `pickWithFallback` and mark it visually so we never silently present
 * English text as though it were the Chinese version.
 */
export function pick(
  value: Partial<Bilingual> | string | undefined | null,
  locale: Locale,
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const wanted = value[locale];
  if (wanted && wanted.trim()) return wanted.trim();
  const other = locale === 'en' ? value.zh : value.en;
  return (other ?? '').trim();
}

export function pickWithFallback(
  value: Partial<Bilingual> | string | undefined | null,
  locale: Locale,
): { text: string; isFallback: boolean; fallbackLocale: Locale | null } {
  if (value == null) return { text: '', isFallback: false, fallbackLocale: null };
  if (typeof value === 'string')
    return { text: value, isFallback: false, fallbackLocale: null };
  const wanted = value[locale];
  if (wanted && wanted.trim())
    return { text: wanted.trim(), isFallback: false, fallbackLocale: null };
  const otherLocale: Locale = locale === 'en' ? 'zh' : 'en';
  const other = value[otherLocale];
  return {
    text: (other ?? '').trim(),
    isFallback: Boolean(other && other.trim()),
    fallbackLocale: other && other.trim() ? otherLocale : null,
  };
}

/** Extract the locale from a pathname like /zh/visit → 'zh'. */
export function localeFromPath(pathname: string): Locale {
  const seg = pathname.split('/').filter(Boolean)[0];
  return (LOCALES as readonly string[]).includes(seg ?? '')
    ? (seg as Locale)
    : DEFAULT_LOCALE;
}

/** Strip the locale prefix: /zh/visit → /visit ; /en → / */
export function pathWithoutLocale(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if ((LOCALES as readonly string[]).includes(parts[0] ?? '')) parts.shift();
  return '/' + parts.join('/');
}

/**
 * Build a localized href. Always returns a trailing-slash-free absolute path.
 * `rel` may be '/', '/visit', 'visit', or '/church-life/retreat-2026'.
 */
export function localePath(locale: Locale, rel = '/'): string {
  const clean = rel.replace(/^\/+|\/+$/g, '');
  return clean ? `/${locale}/${clean}` : `/${locale}`;
}

/**
 * Given the current URL, produce the equivalent URL in the other language.
 * This is what makes the language switch *preserve the current page*.
 */
export function swapLocale(pathname: string, to: Locale): string {
  return localePath(to, pathWithoutLocale(pathname));
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'zh' : 'en';
}

/* ---------------------------------------------------------------- dates -- */

/**
 * Format a date for a locale.
 *
 * Chinese date convention is 2026年9月21日 (year-first), English is
 * "September 21, 2026". Intl handles this correctly — never hand-roll it.
 * `timeZone` is pinned to the church’s own zone so an event never shifts a
 * day for a visitor reading from Shanghai.
 */
export const CHURCH_TIMEZONE = 'America/Chicago';

export function formatDate(
  date: Date | string,
  locale: Locale,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE_META[locale].intl, {
    timeZone: CHURCH_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...opts,
  }).format(d);
}

export function formatDateRange(
  start: Date | string,
  end: Date | string | undefined,
  locale: Locale,
): string {
  const s = typeof start === 'string' ? new Date(start) : start;
  if (!end) return formatDate(s, locale);
  const e = typeof end === 'string' ? new Date(end) : end;
  const fmt = new Intl.DateTimeFormat(LOCALE_META[locale].intl, {
    timeZone: CHURCH_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  // formatRange collapses "Sep 21 – 23, 2026" correctly per locale.
  return fmt.formatRange(s, e);
}

export function formatWeekday(date: Date | string, locale: Locale): string {
  return formatDate(date, locale, {
    weekday: 'long',
    year: undefined,
    month: undefined,
    day: undefined,
  });
}

/** ISO date string (YYYY-MM-DD) in the church’s timezone, for <time datetime>. */
export function isoDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
