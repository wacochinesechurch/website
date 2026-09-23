# Looking after the website

Written for whoever at the church ends up doing this. No coding required for
anything in Part 1.

---

# Part 1 — Editing the site

## Where to go

**https://www.wacochinesechurch.org/admin**

Sign in with a GitHub account (free — see Part 2 if nobody has set this up
yet). You will see a list of things you can change. Save, and the site updates
itself within a minute or two.

Everything you type has an **English box and a 中文 box**, side by side. Fill in
both. You are creating one item that appears correctly on both versions of the
site — there is no separate Chinese website to keep in step.

## The one thing that matters most

**You do not have to remember to take things down.**

- An **event** disappears from "What's coming up" the day after it happens, and
  moves into the archive by itself.
- A **notice** disappears on the date you set in *"Hide it after this date"*.

This is the whole reason the old site went stale: somebody had to remember, and
eventually nobody did. Now nothing needs remembering. Put a date on it and
forget it.

## Common jobs

**Add an event** → *Events* → *New Event*. Fill in both languages, set the
start date. Tick *Pin to the top* to feature it on the homepage.

**Put a notice at the top of every page** → *Notices* → *New Notice*. One
sentence. Set *Hide it after this date* — this is required, and it is what
stops the notice going stale.

**Change the Sunday time** → *Church details* → *Service times, address and
giving* → *Regular gatherings*. Changing it here changes it on the homepage,
the Visit page, the footer, **and the information Google shows in search
results**. There is only one copy of this fact anywhere.

**Add photographs** → *Church life photos*. Two things to get right:
- The **caption** is content, not decoration. The best ones on this site are
  the church's own: *"there is nothing hotpot cannot fix"*. Write it the way
  you would say it out loud.
- **Describe the photo** is read aloud to blind visitors. Say plainly what is
  in it: *"Twelve people around a table making mooncakes."*

**Answer a visitor question** → *Visitor questions*. Several are written but
have no answer yet, so they are hidden from the public site. **Answering
"Where do I park?" and "Where do the children go?" would help a first-time
visitor more than anything else on this list.** Fill in the answer and set
*Confirmed?* to "Confirmed".

**Add a sermon** → *Sermons*. You need the YouTube video ID — the part after
`watch?v=`. For `youtube.com/watch?v=abc123`, enter `abc123`.

## The "Confirmed?" setting

Some items have a *Confirmed?* dropdown:

- **Confirmed** — published normally.
- **Published, but needs checking** — visible, and listed on the checklist.
- **Not confirmed** — **hidden from the public site entirely.** Used where we
  could not verify something and would rather show nothing than a guess.

## The checklist

**https://www.wacochinesechurch.org/en/review**

Everything still awaiting a decision from the church, generated automatically
from the content. Fix something and its row disappears. It is hidden from
Google and not in the sitemap, but the link is public — do not put anything
confidential in it.

**Start here if you have half an hour.** The items at the top are the ones a
visitor actually trips over.

---

# Part 2 — For whoever set this up

## What it is

| | |
|---|---|
| Framework | Astro 5, fully static output |
| Content | Markdown + YAML in `src/content/` |
| Editing | Sveltia CMS at `/admin` (Decap/Netlify CMS config format) |
| Hosting | Cloudflare Pages (free). Any static host works — nothing is welded to this one |
| Runtime cost | **£0 / $0** beyond the domain name |
| Server | None. There is nothing to patch, back up, or have breached |

The important property: **content lives in the repository as plain files.** If
Sveltia, Astro or the host disappeared tomorrow, every word the church has
written is still sitting there in readable Markdown.

## First-time setup

### 1. Put it on GitHub

```bash
git init && git add -A && git commit -m "Initial site"
git remote add origin https://github.com/YOUR-ORG/YOUR-REPO.git
git push -u origin main
```

Then edit `public/admin/config.yml` and set `repo: YOUR-ORG/YOUR-REPO`.

### 2. Deploy

**Already done.** The repo is connected to Cloudflare Pages, and every push to
`main` deploys to <https://wacochinesechurch.pages.dev>. A push to any other
branch builds a preview at `<branch>.wacochinesechurch.pages.dev`.

To rebuild this elsewhere: build command `npm run build`, output directory
`dist`. `public/_headers` and `public/_redirects` carry the security headers,
cache rules and redirects, and both Cloudflare Pages and Netlify read them, so
the site is not tied to either.

### 3. Turn on CMS sign-in

**This is the one piece still outstanding.** `/admin` loads, but nobody can
sign in until it is done.

Sveltia CMS needs an OAuth provider so volunteers can sign in with GitHub.
Netlify used to offer a free broker at `api.netlify.com/auth`, which is why
`config.yml` has no `base_url` yet; that route went with the move to
Cloudflare. The replacement is <https://github.com/sveltia/sveltia-cms-auth>,
a free Cloudflare Worker on the same account, with `base_url` in `config.yml`
pointing at it. `docs/DEPLOY.md` step 3 has the exact screens and the callback
URL, which has to match character for character.

### 4. Set up the nightly rebuild — please do not skip this

A static site built in February still believes it is February. The build-time
filter drops past events *as of the build*, and `src/scripts/freshness.ts`
re-checks in the visitor's browser — but the **HTML Google and link previews
see** only updates when the site rebuilds.

**Already done.** `.github/workflows/nightly-rebuild.yml` runs daily and POSTs
to the Cloudflare deploy hook held in the repository secret `DEPLOY_HOOK_URL`.
It has been tested end to end — see `docs/DEPLOY.md` step 4.

This is the third of three layers that stop the site rotting. All three are
described in `src/lib/church.ts` and `src/scripts/freshness.ts`.

### 5. Redirects from the old site

`public/_redirects` already maps every old Squarespace URL (`/about`,
`/fellowship`, `/new-page`, `/giving`, `/contacts`, `/latest-announcement`, …)
to its new home, so years of existing links, bookmarks and search results keep
working. It also handles language negotiation at the edge.

## Working on it locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # writes dist/
npm run preview    # serve the built site
npm run preflight  # pre-deploy checks — run before every launch
npm run fonts      # regenerate font subsets (see below)
```

### `npm run preflight`

Run it after a build, before any deploy. It fails on things that would be
embarrassing in public and has already caught several: dead internal links,
leftover placeholders, pages missing a description, an English page with no
Chinese counterpart, a past event still sitting in an "upcoming" list, broken
structured data, and any street address other than the church's own appearing
on a page.

```bash
npm run build && npm run preflight
```

### `npm run fonts`

Only needed after adding a substantial amount of new Chinese copy:

```bash
npm run build && npm run fonts && npm run build
```

It rebuilds the font subsets from the glyphs the rendered pages actually use.
Needs `python3 -m pip install --user fonttools brotli` and the `@fontsource`
packages. Skipping it is safe — characters outside the subset fall back to the
system Chinese font, not to tofu.

## Where things are

```
src/
  content/          all the words and facts — edit these, not the code
    settings/       service times, address, giving, partners
    events/         self-expiring
    announcements/  self-expiring
    fellowships/  ministries/  moments/  faq/  pages/  people/  sermons/  timeline/
  pages/[lang]/     one file per page, rendered twice (en + zh)
  components/       reusable pieces
  styles/tokens.css the entire design system — colour, type, space, motion
  i18n/ui.ts        interface translations
  lib/church.ts     data access, date formatting, "is this still upcoming?"
  scripts/          ~7 KB of JavaScript, total (2.7 KB gzipped)
docs/
  FACT-AUDIT.md     what was verified, what was not, and what contradicted what
  DESIGN.md         why the site looks and behaves the way it does
```

## House rules for anyone editing the code

1. **Never invent church information.** If it is not in `FACT-AUDIT.md` as
   verified, it does not go on the site as fact. Add it to the content with
   `status: unverified` and it will appear on `/review` instead.
2. **Both languages, or neither.** Every visitor-facing string needs `en` and
   `zh`. Untranslated UI keys warn in the dev console.
3. **Alt text is required**, in both languages.
4. **New animation must be inside a `prefers-reduced-motion: no-preference`
   guard.**
5. **New time-sensitive content needs an expiry date.** That is the rule that
   keeps this site from becoming the last one.

## Before launch

- [ ] Set `repo:` in `public/admin/config.yml` (**required** — preflight blocks on it)
- [ ] `npm run build && npm run preflight` — must pass with no blocking items
- [ ] Deploy the OAuth worker and register the GitHub OAuth app (DEPLOY.md step 3)
- [x] ~~Set up the nightly rebuild~~ (step 4) — done and tested
- [ ] Work through `/en/review`
- [ ] Replace `public/og-default.png` with a real share image (1200×630)
- [ ] Confirm the photographs may be used, especially the hero — see the
      consent note on `/review`
- [ ] Point the domain, and check the old-URL redirects resolve
