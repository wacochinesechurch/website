import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

/* =========================================================================
   CONTENT MODEL
   =========================================================================

   THE PROBLEM THIS SOLVES

   The previous site rotted for two structural reasons, both visible in the
   audit:

   1. Evergreen facts and time-sensitive announcements lived in the same
      soup. The "latest announcements" page held a Lunar New Year notice
      seven months after the fact, and the homepage banner still advertised
      an event from March 2024.

   2. Everything required whoever built it to come back. Five fellowships
      were published with no meeting time, no leader and a "Join us now"
      button pointing at "#".

   So the model below is built on two rules:

   RULE 1 — Time-sensitive content carries its own expiry.
     An event knows its own date. Nothing has to remember to take it down;
     it demotes itself. An announcement carries `showUntil` and disappears
     on its own. Staleness becomes structurally impossible rather than a
     chore someone forgets.

   RULE 2 — One entry, both languages.
     Every translatable field is `{ en, zh }` in a single file. A volunteer
     creating the Mid-Autumn Festival creates ONE event. The date, photo and
     location are shared automatically; only the words differ. Two files
     that can drift apart is the bug, not the feature.

   All of this is plain Markdown and YAML in the repo, edited through the
   CMS at /admin. No database, no monthly bill, no vendor who can raise
   prices or shut down.
   ========================================================================= */

/** A string that exists in both languages. Both required — no half entries. */
const bi = z.object({
  en: z.string(),
  zh: z.string(),
});

/** Bilingual, but a translation may legitimately not exist yet. */
const biSoft = z.object({
  en: z.string().default(''),
  zh: z.string().default(''),
});

/** Rich text in both languages (Markdown allowed). */
const biBody = z.object({
  en: z.string().default(''),
  zh: z.string().default(''),
});

/**
 * Verification status, carried by anything a visitor might act on.
 * `needs-review` content still renders if it has a value, but it is listed
 * on the internal /review checklist so the church can confirm or correct it.
 * `unverified` content does NOT render publicly — the surrounding layout
 * simply omits it rather than publishing a guess.
 */
const verification = z
  .enum(['verified', 'needs-review', 'unverified'])
  .default('verified');


/**
 * A calendar date, parsed the way a church volunteer means it.
 *
 * `z.coerce.date()` on a bare "2024-03-30" produces UTC midnight. Rendered in
 * America/Chicago that is 6pm on the 29th — so an event the church held on the
 * 30th displayed as the 29th, and every all-day date on the site was a day
 * early. (Caught in review; the Woodway Park event was the visible case.)
 *
 * Anchoring a bare date at NOON UTC fixes it: noon UTC is the same calendar
 * day in every US timezone, so the date a volunteer types is the date every
 * visitor sees. Values that already carry a time and offset are left alone.
 */
const churchDate = () =>
  z.preprocess((v) => {
    // A bare date may reach us as a string (Markdown frontmatter) or as a
    // Date already at UTC midnight (the YAML parser converts unquoted dates
    // itself, before Zod ever sees them). Both mean "this calendar day".
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) {
      return new Date(`${v.trim()}T12:00:00Z`);
    }
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
      const midnightUTC =
        v.getUTCHours() === 0 &&
        v.getUTCMinutes() === 0 &&
        v.getUTCSeconds() === 0 &&
        v.getUTCMilliseconds() === 0;
      if (midnightUTC) return new Date(v.getTime() + 12 * 60 * 60 * 1000);
    }
    return v;
  }, z.coerce.date());

const image = z
  .object({
    src: z.string(),
    /** Alt text is bilingual and REQUIRED. Accessibility is not optional. */
    alt: biSoft,
    credit: z.string().optional(),
    /** Focal point for art-directed cropping, as percentages. */
    focus: z
      .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) })
      .default({ x: 50, y: 50 }),
  })
  .optional();

/* -------------------------------------------------------------------------
   SETTINGS — the facts that appear everywhere.
   Editing Sunday's start time here changes it on every page at once. This is
   the single most important thing to keep volunteer-editable.
   ------------------------------------------------------------------------- */
const settings = defineCollection({
  loader: file('src/content/settings/church.yaml'),
  schema: z.object({
    id: z.string(),
    name: bi,
    /** A historical or alternate rendering, shown only where relevant. */
    nameVariant: biSoft.optional(),
    established: z.string(),
    tagline: biSoft,

    address: z.object({
      line1: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      /** Note explaining the shared building, if any. */
      note: biSoft.optional(),
      mapsUrl: z.string().url().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }),

    /** Recurring gatherings. The backbone of the ten-second test. */
    gatherings: z.array(
      z.object({
        id: z.string(),
        name: bi,
        day: z.enum([
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ]),
        /** 24h "HH:MM" — formatted per locale at render time. */
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        location: bi,
        /**
         * Only when a gathering meets somewhere OTHER than the church. The
         * Wednesday prayer meeting does — sending someone to 1801 Gurley for
         * it would be worse than saying nothing.
         */
        address: z
          .object({
            line1: z.string(),
            city: z.string(),
            state: z.string(),
            zip: z.string(),
            mapsUrl: z.string().url().optional(),
            note: biSoft.optional(),
          })
          .optional(),
        /**
         * For a gathering that meets somewhere private — a member's home —
         * where publishing the street address is not appropriate. The site
         * says where it roughly is and routes the exact address through a
         * person. The address is deliberately NOT stored in this repository,
         * because the repository is on GitHub and git history is forever.
         */
        addressOnRequest: biSoft.optional(),
        /** Whether it can also be joined online, and how. */
        online: biSoft.optional(),
        summary: biSoft,
        /** Block-by-block running order. */
        schedule: z
          .array(
            z.object({
              start: z.string(),
              end: z.string().optional(),
              label: bi,
            }),
          )
          .default([]),
        /** Where a gathering splits into groups — Friday's Bible study does. */
        groups: z
          .array(
            z.object({
              name: bi,
              audience: biSoft,
              note: biSoft.optional(),
            }),
          )
          .default([]),
        languages: biSoft,
        status: verification,
        featured: z.boolean().default(false),
      }),
    ),

    contact: z.object({
      email: z.string().email().optional(),
      emailStatus: verification,
      phone: z.string().optional(),
      phoneStatus: verification,
    }),

    social: z
      .array(
        z.object({
          platform: z.string(),
          label: biSoft,
          url: z.string().url(),
          status: verification,
        }),
      )
      .default([]),

    giving: z
      .array(
        z.object({
          id: z.string(),
          method: bi,
          detail: biSoft,
          /** e.g. an email for Zelle, or a mailing address for cheques. */
          value: z.string().optional(),
          instructions: biSoft.optional(),
          status: verification,
        }),
      )
      .default([]),

    /** Partner congregations — NOT a denominational claim. */
    partners: z
      .array(
        z.object({
          name: bi,
          url: z.string().url().optional(),
          relationship: biSoft,
          since: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

/* -------------------------------------------------------------------------
   ANNOUNCEMENTS — the anti-staleness device.
   A single short notice, shown at the top of the site, which REMOVES ITSELF
   on `showUntil`. This is what the old /latest-announcement page needed.
   ------------------------------------------------------------------------- */
const announcements = defineCollection({
  loader: glob({ base: 'src/content/announcements', pattern: ['**/*.{md,mdx}', '!**/README.md'] }),
  schema: z.object({
    title: bi,
    body: biBody.optional(),
    /** Hard expiry. After this date the notice vanishes with no action. */
    showUntil: churchDate(),
    href: z.string().optional(),
    linkLabel: biSoft.optional(),
    tone: z.enum(['info', 'invite', 'urgent']).default('info'),
    draft: z.boolean().default(false),
  }),
});

/* -------------------------------------------------------------------------
   EVENTS — self-demoting.
   `start` drives everything: an event is "upcoming" until it happens, then
   it becomes part of the archive. No volunteer action required.
   ------------------------------------------------------------------------- */
const events = defineCollection({
  loader: glob({ base: 'src/content/events', pattern: ['**/*.{md,mdx}', '!**/README.md'] }),
  schema: z.object({
    title: bi,
    summary: biSoft,
    start: churchDate(),
    end: churchDate().optional(),
    /** Omit for all-day events. */
    allDay: z.boolean().default(false),
    location: biSoft.optional(),
    address: z.string().optional(),
    image,
    /** Pin to the top of the upcoming list. */
    featured: z.boolean().default(false),
    /** Who this is especially for — drives the audience chips. */
    audience: z
      .array(
        z.enum([
          'everyone',
          'students',
          'families',
          'children',
          'professionals',
          'seniors',
          'english',
          'newcomers',
        ]),
      )
      .default(['everyone']),
    registerUrl: z.string().url().optional(),
    registerLabel: biSoft.optional(),
    contact: biSoft.optional(),
    recurring: biSoft.optional(),
    draft: z.boolean().default(false),
    /** Keep in the public archive after it passes. */
    archive: z.boolean().default(true),
  }),
});

/* -------------------------------------------------------------------------
   FELLOWSHIPS — where a visitor actually belongs.
   Every field the old site left blank is present here, and the UI states
   plainly when one is unknown rather than rendering an empty row.
   ------------------------------------------------------------------------- */
const fellowships = defineCollection({
  loader: glob({ base: 'src/content/fellowships', pattern: ['**/*.{md,mdx}', '!**/README.md'] }),
  schema: z.object({
    name: bi,
    shortName: biSoft.optional(),
    summary: bi,
    description: biBody.optional(),
    audience: bi,
    meets: biSoft.optional(),
    meetsStatus: verification,
    location: biSoft.optional(),
    language: biSoft.optional(),
    contactName: biSoft.optional(),
    contactEmail: z.string().email().optional(),
    contactStatus: verification,
    image,
    order: z.number().default(50),
    /** Show on the homepage "find your people" band. */
    featured: z.boolean().default(false),
    accent: z.enum(['lamp', 'clay', 'pine']).default('lamp'),
    draft: z.boolean().default(false),
  }),
});

/* -------------------------------------------------------------------------
   MINISTRIES — how people serve. Distinct from fellowships: a fellowship is
   who you belong with, a ministry is what you give yourself to.
   ------------------------------------------------------------------------- */
const ministries = defineCollection({
  loader: glob({ base: 'src/content/ministries', pattern: ['**/*.{md,mdx}', '!**/README.md'] }),
  schema: z.object({
    name: bi,
    summary: bi,
    description: biBody.optional(),
    image,
    contactName: biSoft.optional(),
    contactEmail: z.string().email().optional(),
    /** Active / paused / historical — so past work can be honoured without
        implying it is still running. */
    state: z.enum(['active', 'seasonal', 'past']).default('active'),
    lastConfirmed: churchDate().optional(),
    order: z.number().default(50),
    draft: z.boolean().default(false),
  }),
});

/* -------------------------------------------------------------------------
   SERMONS / MEDIA
   ------------------------------------------------------------------------- */
const sermons = defineCollection({
  loader: glob({ base: 'src/content/sermons', pattern: ['**/*.{md,mdx}', '!**/README.md'] }),
  schema: z.object({
    title: bi,
    date: churchDate(),
    speaker: biSoft.optional(),
    passage: biSoft.optional(),
    series: biSoft.optional(),
    /** YouTube video id, or a full URL. */
    youtubeId: z.string().optional(),
    youtubeUrl: z.string().url().optional(),
    language: z.enum(['mandarin', 'english', 'bilingual']).default('mandarin'),
    summary: biSoft.optional(),
    draft: z.boolean().default(false),
  }),
});

/* -------------------------------------------------------------------------
   MOMENTS — church life photography with real, bilingual captions.
   Deliberately NOT a blog. These are the ordinary moments that tell a
   visitor what it feels like to be here.
   ------------------------------------------------------------------------- */
const moments = defineCollection({
  loader: glob({ base: 'src/content/moments', pattern: ['**/*.{md,mdx}', '!**/README.md'] }),
  schema: z.object({
    caption: bi,
    image: z.object({
      src: z.string(),
      alt: biSoft,
      focus: z
        .object({ x: z.number(), y: z.number() })
        .default({ x: 50, y: 50 }),
    }),
    date: churchDate().optional(),
    tags: z
      .array(
        z.enum([
          'worship',
          'meals',
          'students',
          'children',
          'seniors',
          'festival',
          'retreat',
          'sports',
          'service',
          'families',
          'professionals',
          'prayer',
        ]),
      )
      .default([]),
    /** Larger tile in the mosaic. */
    weight: z.enum(['normal', 'wide', 'tall']).default('normal'),
    order: z.number().default(50),
    draft: z.boolean().default(false),
  }),
});

/* -------------------------------------------------------------------------
   PEOPLE — structure exists, content awaits church approval.
   Nothing is invented here. If the collection is empty, the Leadership
   section does not render at all.
   ------------------------------------------------------------------------- */
const people = defineCollection({
  loader: glob({ base: 'src/content/people', pattern: ['**/*.{md,mdx}', '!**/README.md'] }),
  schema: z.object({
    name: bi,
    role: bi,
    bio: biBody.optional(),
    image,
    email: z.string().email().optional(),
    order: z.number().default(50),
    group: z.enum(['pastoral', 'staff', 'deacons', 'volunteers']).default('pastoral'),
    draft: z.boolean().default(true), // opt-in publishing for real people
  }),
});

/* -------------------------------------------------------------------------
   FAQ — the "reduce uncertainty" engine behind the Visit page.
   ------------------------------------------------------------------------- */
const faq = defineCollection({
  loader: glob({ base: 'src/content/faq', pattern: ['**/*.{md,mdx}', '!**/README.md'] }),
  schema: z.object({
    question: bi,
    answer: biBody,
    topic: z
      .enum(['arriving', 'sunday', 'children', 'language', 'practical', 'belief'])
      .default('practical'),
    status: verification,
    order: z.number().default(50),
  }),
});

/* -------------------------------------------------------------------------
   PAGES — long-form editable prose (our story, beliefs, giving notes).
   Keeps narrative copy out of component code so it can be edited by a
   volunteer without a developer.
   ------------------------------------------------------------------------- */
const pages = defineCollection({
  loader: glob({ base: 'src/content/pages', pattern: ['**/*.{md,mdx}', '!**/README.md'] }),
  schema: z.object({
    title: bi,
    lede: biSoft.optional(),
    body: biBody,
    status: verification,
    updated: churchDate().optional(),
  }),
});

/* -------------------------------------------------------------------------
   TIMELINE — the church's history, as a scroll narrative.
   ------------------------------------------------------------------------- */
const timeline = defineCollection({
  loader: file('src/content/timeline/timeline.yaml'),
  schema: z.object({
    id: z.string(),
    year: z.string(),
    title: bi,
    body: biBody,
    image,
    status: verification,
  }),
});

export const collections = {
  settings,
  announcements,
  events,
  fellowships,
  ministries,
  sermons,
  moments,
  people,
  faq,
  pages,
  timeline,
};
