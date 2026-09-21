import { getCollection, getEntry } from 'astro:content';
import type { Locale } from '@i18n/config';
import { pick, CHURCH_TIMEZONE } from '@i18n/config';

/* =========================================================================
   CHURCH DATA ACCESS
   A thin, typed layer over the content collections so page components never
   reach into raw frontmatter. Also the single place where "is this event
   still upcoming?" is decided.
   ========================================================================= */

export async function getChurch() {
  const entry = await getEntry('settings', 'church');
  if (!entry) throw new Error('Missing src/content/settings/church.yaml');
  return entry.data;
}

export type Church = Awaited<ReturnType<typeof getChurch>>;

export function formatAddress(church: Church, multiline = false): string {
  const { line1, city, state, zip } = church.address;
  return multiline
    ? `${line1}\n${city}, ${state} ${zip}`
    : `${line1}, ${city}, ${state} ${zip}`;
}

/**
 * Render "HH:MM" in the reader's language.
 *
 * English gets "11:00 AM". Chinese gets "上午11:00" — the 上午/下午 marker is
 * not optional politeness, it is how a Chinese reader expects a time of day
 * to be written, and a bare "11:00" for an evening Bible study would be
 * genuinely ambiguous. `hour12: true` is what makes Intl produce it.
 */
export function formatTime(hhmm: string, locale: Locale): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (h == null || m == null || Number.isNaN(h)) return hhmm;
  const d = new Date(Date.UTC(2000, 0, 2, h, m));
  const out = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(d);

  if (locale !== 'zh') return out;

  /**
   * Intl labels everything from noon onward 下午. Chinese does not work that
   * way: 下午 runs to roughly six, after which it is 晚上, and the hour around
   * noon is 中午. "下午6:00" for Friday Bible study reads as a mistake to a
   * native speaker — which, for the one gathering a nervous newcomer is most
   * likely to try first, is worth getting right.
   */
  if (h >= 18) return out.replace('下午', '晚上');
  if (h === 12) return out.replace('下午', '中午');
  return out;
}

export function formatTimeRange(
  start: string,
  end: string | undefined,
  locale: Locale,
): string {
  if (!end) return formatTime(start, locale);
  const sep = locale === 'zh' ? ' – ' : ' – ';
  return `${formatTime(start, locale)}${sep}${formatTime(end, locale)}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function formatWeekdayName(day: string, locale: Locale): string {
  const idx = WEEKDAY_INDEX[day] ?? 0;
  // 2024-01-07 was a Sunday; add the offset to land on the right weekday.
  const d = new Date(Date.UTC(2024, 0, 7 + idx));
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(d);
}

/** schema.org `dayOfWeek` value, for structured data. */
export function schemaDay(day: string): string {
  return `https://schema.org/${day.charAt(0).toUpperCase()}${day.slice(1)}`;
}

/* ------------------------------------------------------------------ time -- */

/**
 * "Now", evaluated at BUILD time.
 *
 * Important: a static site built in March still thinks it is March. That is
 * exactly how the old site ended up advertising a Lunar New Year party in
 * September. So this is only half the defence — the other half is
 * `data-expires` attributes that the browser re-checks at READ time
 * (see src/scripts/freshness.ts), plus a scheduled daily rebuild.
 */
export function buildNow(): Date {
  return new Date();
}

export function isUpcoming(
  ev: { start: Date; end?: Date },
  now: Date = buildNow(),
): boolean {
  const finish = ev.end ?? ev.start;
  // An event is "upcoming" until the end of the day it finishes, so a
  // Saturday retreat does not vanish at 00:01 on Saturday morning.
  //
  // End of day in WACO, not on the build machine. setHours() would resolve in
  // whatever timezone the builder happens to run in — UTC on Netlify, local on
  // a volunteer's laptop — which made an evening event drop off the homepage
  // at 6:59pm while it was still going on.
  return endOfDayInChurchTime(finish).getTime() >= now.getTime();
}

const notDraft = <T extends { data: { draft?: boolean } }>(e: T) => !e.data.draft;

export async function getUpcomingEvents(limit?: number) {
  const all = await getCollection('events', notDraft);
  const now = buildNow();
  const upcoming = all
    .filter((e) => isUpcoming(e.data, now))
    .sort((a, b) => {
      if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
      return a.data.start.getTime() - b.data.start.getTime();
    });
  return typeof limit === 'number' ? upcoming.slice(0, limit) : upcoming;
}

export async function getPastEvents(limit?: number) {
  const all = await getCollection('events', notDraft);
  const now = buildNow();
  const past = all
    .filter((e) => !isUpcoming(e.data, now) && e.data.archive)
    .sort((a, b) => b.data.start.getTime() - a.data.start.getTime());
  return typeof limit === 'number' ? past.slice(0, limit) : past;
}

export async function getLiveAnnouncements() {
  const all = await getCollection('announcements', notDraft);
  const now = buildNow();
  return all
    // showUntil means "hide it AFTER this date", so the notice is live for
    // the whole of that day in Waco — not until 7am, which is where noon UTC
    // lands (see churchDate() in content.config.ts).
    .filter((a) => endOfDayInChurchTime(a.data.showUntil).getTime() >= now.getTime())
    .sort((a, b) => a.data.showUntil.getTime() - b.data.showUntil.getTime());
}

export async function getFellowships() {
  const all = await getCollection('fellowships', notDraft);
  return all.sort((a, b) => a.data.order - b.data.order);
}

export async function getMinistries(state?: 'active' | 'seasonal' | 'past') {
  const all = await getCollection('ministries', notDraft);
  return all
    .filter((m) => (state ? m.data.state === state : true))
    .sort((a, b) => a.data.order - b.data.order);
}

export async function getSermons(limit?: number) {
  const all = await getCollection('sermons', notDraft);
  const sorted = all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

export async function getMoments(limit?: number) {
  const all = await getCollection('moments', notDraft);
  const sorted = all.sort((a, b) => a.data.order - b.data.order);
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

export async function getPeople() {
  const all = await getCollection('people', notDraft);
  return all.sort((a, b) => a.data.order - b.data.order);
}

export async function getFaq(topic?: string) {
  const all = await getCollection('faq');
  return all
    .filter((f) => f.data.status !== 'unverified')
    .filter((f) => (topic ? f.data.topic === topic : true))
    .sort((a, b) => a.data.order - b.data.order);
}

export async function getTimeline() {
  const all = await getCollection('timeline');
  // A non-numeric year sorts last deterministically. It used to produce NaN,
  // which a comparator treats as 0 — so the order was really just file order,
  // and would have changed the day someone reordered the YAML.
  const key = (y: string) => (Number.isFinite(Number(y)) ? Number(y) : Infinity);
  return all.sort((a, b) => key(a.data.year) - key(b.data.year));
}

export async function getPage(id: string) {
  return getEntry('pages', id);
}

/* --------------------------------------------------------- structured data */

/* ---------------------------------------------------------------- expiry --- */
/**
 * Milliseconds to add to a Waco wall-clock reading (parsed as if UTC) to get
 * the real instant it names.
 */
function churchOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CHURCH_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  // asUTC has whole-second resolution, so strip the milliseconds from the
  // other side too — otherwise they leak into the offset and push the
  // result a second past midnight into the following day.
  return at.getTime() - at.getUTCMilliseconds() - asUTC;
}

/**
 * The exact instant a calendar day ENDS in Waco.
 *
 * Dates here are stored as noon UTC (see churchDate() in content.config.ts) so
 * that a bare "2026-10-05" cannot drift across a date line when it is
 * formatted for America/Chicago. That makes them right for DISPLAY and wrong
 * for EXPIRY: noon UTC is 7am in Waco, so anything expiring "on" its own date
 * disappeared on the morning of the very day it was meant to be read.
 *
 * Expiry is therefore resolved HERE, at build time, where the full timezone
 * database is available — leaving the browser only two instants to compare.
 */
export function endOfDayInChurchTime(date: Date): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHURCH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  // Resolved twice, so a day containing a DST change lands on the offset
  // actually in force at the END of that day rather than the start.
  const wall = Date.parse(`${ymd}T23:59:59.999Z`);
  const first = wall + churchOffsetMs(new Date(wall));
  return new Date(wall + churchOffsetMs(new Date(first)));
}

/**
 * schema.org markup so Google can answer "what time is the Chinese church in
 * Waco on Sunday?" directly in search — which is how a lot of people will
 * actually find this church.
 */
export async function churchJsonLd(locale: Locale, siteUrl: string) {
  const church = await getChurch();
  const sameAs = church.social
    .filter((s) => s.status !== 'unverified')
    .map((s) => s.url);

  return {
    '@context': 'https://schema.org',
    '@type': 'Church',
    '@id': `${siteUrl}/#church`,
    name: pick(church.name, locale),
    alternateName: locale === 'zh' ? church.name.en : church.name.zh,
    description: pick(church.tagline, locale),
    url: `${siteUrl}/${locale}`,
    email: church.contact.emailStatus !== 'unverified' ? church.contact.email : undefined,
    foundingDate: church.established,
    address: {
      '@type': 'PostalAddress',
      streetAddress: church.address.line1,
      addressLocality: church.address.city,
      addressRegion: church.address.state,
      postalCode: church.address.zip,
      addressCountry: 'US',
    },
    geo:
      church.address.lat && church.address.lng
        ? {
            '@type': 'GeoCoordinates',
            latitude: church.address.lat,
            longitude: church.address.lng,
          }
        : undefined,
    ...(sameAs.length ? { sameAs } : {}),
    event: church.gatherings
      .filter((g) => g.status !== 'unverified')
      .map((g) => ({
        '@type': 'Event',
        name: pick(g.name, locale),
        eventSchedule: {
          '@type': 'Schedule',
          byDay: schemaDay(g.day),
          startTime: g.startTime,
          endTime: g.endTime,
          repeatFrequency: 'P1W',
          scheduleTimezone: CHURCH_TIMEZONE,
        },
        /**
         * A gathering that does NOT meet at the church must not be published
         * with the church's address attached. The Wednesday prayer meeting is
         * in a member's home: it gets a name and no address at all, because
         * the only correct address is one we deliberately do not store.
         */
        location: {
          '@type': 'Place',
          name: pick(g.location, locale),
          ...(g.addressOnRequest
            ? {}
            : {
                address: g.address
                  ? `${g.address.line1}, ${g.address.city}, ${g.address.state} ${g.address.zip}`
                  : formatAddress(church),
              }),
        },
      })),
  };
}
