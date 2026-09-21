# Design rationale

Why the site looks and behaves the way it does. Every decision here is
defensible; where an obvious alternative was rejected, the reason is stated.

---

## 1. The brand idea came from the church, not from us

Two things in the church's own words did all the work.

Its **founding verse**, on its own About page, is 1 Peter 2:9 — *"called you
out of darkness into his wonderful light."* Its **own history** describes what
it became: 「许多游子温馨的家园」 — *a warm home for many travellers* — and, in
English, *"a home away from home."*

So the identity is **LIGHT** and **HOME**. Not chosen from a moodboard. The
church picked both, decades ago.

The visual translation is **a lit doorway seen from outside on a cold night**:
warm light inside a warm dark. That is the logo, the hero, the colour system
and the motion, all saying one thing.

What this ruled out: red-and-gold chinoiserie, lanterns, brush-script
lettering, dragons — none of which this congregation's actual life looks
anything like. Its photographs are folding tables, a basketball court, a
kitchen counter and a fellowship hall.

---

## 2. Colour

| Token | Role |
|---|---|
| **Ink** `#14110e` → `#4a4038` | A *warm* near-black. Night, and the ink of a written language. Never blue-grey. |
| **Paper** `#f8f4ed` | Warm off-white. Paper, plaster, a tablecloth. |
| **Lamp** `#9a5b18` / `#e0a455` | Honey-amber. The light in the window. The primary accent. |
| **Clay** `#9c4a34` | Muted terracotta. A second, human warmth. |
| **Pine** `#435847` | Deep muted green. Growth; Texas live oak. Used sparingly. |

Two values for Lamp because contrast demands it: `#9a5b18` reaches **5.1:1**
on paper, `#e0a455` reaches **8.6:1** on ink. A single amber cannot do both.

**The site alternates lit and dark sections on purpose.** That alternation *is*
the "out of darkness into light" idea, which is why there is no dark-mode
toggle — the rhythm is authored, not switched. `[data-surface="ink"]` /
`"warm"` / default re-map the semantic tokens per section.

---

## 3. Typography — the one decision the whole brand rests on

**Source Serif 4** + **Source Sans 3** for Latin, **Noto Serif SC** for
Chinese (with Noto Sans SC / PingFang SC as the system fallback for Chinese UI
labels — see the font note below).

That looks like a safe choice. It is actually the sharpest available.

Noto Serif SC and Noto Sans SC *are* Source Han Serif and Source Han Sans — and
Source Serif and Source Sans are the **Latin members of that same superfamily**,
drawn by the same team, with harmonised weights, proportions and stroke
contrast across scripts.

For a church whose entire identity is two languages held as equals, using two
scripts that genuinely belong to one typeface is the argument, made in the
type itself. Pairing a fashionable display serif with Noto SC would have looked
more "designed" and meant nothing.

Practical consequences:

- **Base size 17px**, not 16 — CJK glyphs are denser and need it.
- **Separate line-heights**: 1.72 for Latin prose, **1.95 for Chinese**. CJK
  needs materially more leading at the same size.
- **Tracking is script-aware.** Latin headings get `-0.022em`; Chinese headings
  get `+0.01em`, because a CJK em box is already tight and negative tracking
  makes it muddy. Every `.eyebrow` and all-caps label drops its
  `text-transform` and switches to looser tracking under `:lang(zh)` — letter-
  spaced uppercase is meaningless in Chinese.
- **The fonts are self-hosted and subset.** Google Fonts was measured serving
  **1.8 MB on /en and 2.7 MB on /zh** — it chunks the CJK faces into ~100
  generic buckets and this site's text lands in dozens of them, on top of a
  227 KB render-blocking stylesheet with 202 `@font-face` blocks. Subsetting to
  the 683 Chinese characters the church has actually written, and splitting
  those by `unicode-range` so an English page fetches only the 28 glyphs in the
  bilingual lockup, gives **70 KB on /en and 293 KB on /zh** — 96% and 89%
  less — with no third-party request at all. Chinese *sans* is deliberately not
  webfonted: it carried only small UI labels, and the system faces already in
  the stack render them well. Anything outside the subset falls back to a
  system Chinese font, never to tofu. Regenerate with `npm run fonts`.

---

## 4. Shape and motion

**Shape is deliberately restrained** — 2–4px radii. Church architecture,
printed bulletins and photographs have square corners. The 16px pill radius of
a SaaS dashboard would fight everything else here.

There is exactly **one expressive shape**: the arch. It is the logo, and it is
the hero aperture.

**Two motion ideas, and only two.**

1. **The lit doorway.** The hero photograph is seen *through* an arch, with a
   warm glow rising behind it once on load. Not a full-bleed photo with a
   headline on top — that is every church site in America. Here you are outside
   in the dark, looking through a lit door into a room where people are eating.
2. **The rail that fills with light.** On the About page a warm line runs down
   the history and fills as you scroll, 1993 to today. The same idea told over
   time instead of in one frame.

Everything else is one shared, quiet gesture: content **warms, lifts slightly
and settles**, as if a lamp were turned up on it — never sliding in from the
side, never bouncing. Implemented as CSS scroll-driven animation
(`animation-timeline: view()`), so it runs off the main thread and costs no
JavaScript, with an IntersectionObserver fallback for browsers without it.

`prefers-reduced-motion` collapses every duration token to 1ms and hard-disables
every keyframe animation, globally rather than per component.

---

## 5. Information architecture — three changes to the brief

**Visit is first in the navigation, before About.** The site's primary job is
turning a stranger into a visitor. Putting the church's self-description ahead
of the visitor's own question gets the priority backwards.

**Fellowships and Serving were merged into one "Community" page.** The old site
split 团契 and 服侍 into separate top-level pages. They are two halves of one
question — *where would I fit?* — and splitting them made both harder to find.
One page, two clearly-labelled bands.

**Students got their own URL.** The brief listed this as optional. The research
says it is a front door: this church was literally founded in December 1993 as
a Baylor Chinese students' fellowship, its largest group is still 大学生团契,
and the highest-intent search anybody will run is some version of *"Chinese
church near Baylor"*. A section buried inside /community cannot rank for that
or be pasted into a WeChat group chat. `/en/students` and `/zh/students` can.

---

## 6. Bilingual architecture

**Parallel prefixed routes** — `/en/visit` and `/zh/visit`. `prefixDefaultLocale`
is on, so there is no bare `/about` implying English is the "real" site. The
switch preserves the current page. `/` negotiates from `Accept-Language` at the
edge, with a real usable page as the no-JS fallback.

**One content file, both languages.** Every translatable field is `{ en, zh }`
in a single entry. A volunteer creating the Mid-Autumn Festival creates *one*
event — date, photo and location shared automatically, only the words differ.
Two files that can silently drift apart is the bug, not the feature.

**The translations are not mirrors.** English church copy is direct and
personal; Chinese church copy is more hospitable and slightly more formal.
"Plan your visit" is 「初次来访指南」 — *first-time visitor's guide* — not
「计划你的访问」, which reads like booking a hotel.

Dates and times go through `Intl` with the church's timezone pinned, so an
event never shifts a day for someone reading from Shanghai, and Chinese gets
its 上午/下午 marker rather than a bare, ambiguous "11:00".

---

## 7. How honesty is expressed in the design

This is the part most church sites get wrong, and it shaped several components.

- A fellowship with no published meeting time **says so and offers a way to
  ask** — it does not render an empty row, and it certainly does not invent a
  time. The old site listed five groups with no time, no place, and a "Join us
  now" button pointing at `#`.
- The **Leadership section does not exist** on the rendered page, because no
  leader is named anywhere publicly. The code is complete; the collection is
  empty.
- **No phone number** appears, because the one in directories reaches Emmanuel
  Baptist's pastor.
- The **sermon archive is honestly empty**, and says the YouTube channel has
  been quiet since December 2023 rather than implying a live feed.
- The **giving page labels its Zelle destination in words**. The old site put a
  Zelle logo next to an email address and left the connection to be inferred
  from visual adjacency — for a payment destination, that is not good enough.
- The **serving record is dated**, presented as "where this church has put its
  hands" with years attached, rather than as current activity we cannot confirm.

Every gap is listed on `/en/review`, generated from the content itself.

---

## 8. Performance

| | |
|---|---|
| Total JavaScript | **~2.3 KB** uncompressed |
| Homepage HTML | ~41 KB, **~8 KB gzipped** |
| Largest source image | 1.6 MB → **187 KB** at display size |
| Render-blocking | one stylesheet, no third-party requests |

Motion costs nothing because it is CSS scroll-driven rather than scripted.
Images go through `astro:assets` with per-breakpoint AVIF/WebP. Everything is
prerendered static HTML — no server, no runtime, no cold starts.
