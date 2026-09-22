/* =========================================================================
   FRESHNESS GUARD — the second line of defence against a stale site.

   THE PROBLEM

   A static site is built once and then served for weeks. The build thinks it
   is forever the day it ran. That is precisely how the old site came to be
   advertising a Lunar New Year party in September, and a March 2024 picnic
   as its lead story in 2026.

   Build-time filtering alone cannot fix this, because the build is in the
   past. So there are three layers:

     1. BUILD TIME  — getUpcomingEvents() drops anything already finished.
     2. READ TIME   — this file. The browser re-checks every dated element
                      against the visitor’s actual clock and demotes anything
                      that has since passed. Works even if nobody rebuilds.
     3. SCHEDULED   — a daily rebuild (see netlify.toml / the deploy notes)
                      so the HTML itself stays honest for crawlers too.

   Layer 2 is what makes the difference between "out of date" and "wrong".
   ========================================================================= */

type Demotable = HTMLElement & { dataset: { expires?: string } };

/**
 * `data-expires` and `data-event-end` are always exact UTC instants, resolved
 * at BUILD time by endOfDayInChurchTime() in src/lib/church.ts — because only
 * the build has a timezone database to tell it when a day actually ends in
 * Waco. That leaves this file with two numbers to compare, and no date maths
 * of its own to get wrong.
 */
function hasPassed(iso: string, now: number): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return t < now;
}

function run() {
  const now = Date.now();

  /* --- 1. Announcements past their showUntil date remove themselves ----- */
  document
    .querySelectorAll<Demotable>('[data-expires]')
    .forEach((el) => {
      const iso = el.dataset.expires;
      if (iso && hasPassed(iso, now)) el.remove();
    });

  /* --- 2. Events that have happened stop claiming to be upcoming -------- */
  const passedEvents: Demotable[] = [];
  document
    .querySelectorAll<Demotable>('[data-event-end]')
    .forEach((el) => {
      const iso = el.getAttribute('data-event-end');
      if (iso && hasPassed(iso, now)) {
        el.setAttribute('data-passed', '');
        passedEvents.push(el);
      }
    });

  /* --- 3. If a whole "upcoming" list has emptied out, say so honestly
           rather than showing a heading above nothing. ------------------- */
  document
    .querySelectorAll<HTMLElement>('[data-upcoming-list]')
    .forEach((list) => {
      const items = Array.from(
        list.querySelectorAll<HTMLElement>('[data-event-end]'),
      );
      const remaining = items.filter((i) => !i.hasAttribute('data-passed'));
      if (items.length && remaining.length === 0) {
        list.setAttribute('data-empty', '');
        const fallbackId = list.getAttribute('data-empty-target');
        if (fallbackId) {
          document.getElementById(fallbackId)?.removeAttribute('hidden');
        }
      }
    });

  /* --- 4. Relative labels ("This Sunday", "Today") are computed here
           rather than baked in, because a baked one is a lie by Tuesday. -- */
  document
    .querySelectorAll<HTMLElement>('[data-relative-date]')
    .forEach((el) => {
      const iso = el.getAttribute('data-relative-date');
      const lang = el.getAttribute('data-locale') === 'zh' ? 'zh-CN' : 'en-US';
      if (!iso) return;
      const then = Date.parse(iso);
      if (Number.isNaN(then)) return;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const days = Math.round(
        (new Date(then).setHours(0, 0, 0, 0) - startOfToday.getTime()) /
          86_400_000,
      );

      if (days < 0 || days > 13) return; // leave the absolute date in place

      try {
        const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
        const label =
          days <= 6
            ? rtf.format(days, 'day')
            : rtf.format(Math.round(days / 7), 'week');
        const slot = el.querySelector('[data-relative-slot]') ?? el;
        slot.textContent = label;
        // The label is rendered hidden, because until this runs there is
        // nothing truthful to put in it.
        el.hidden = false;
      } catch {
        /* Intl.RelativeTimeFormat missing — the absolute date already shows */
      }
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run, { once: true });
} else {
  run();
}

// Re-check when a visitor returns to a long-open tab.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') run();
});
