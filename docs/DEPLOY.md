# Deploying

Plan: **stage on the free `pages.dev` URL first, switch the domain once the
church has signed off.** Nothing about the current site breaks while you do
this — the real domain keeps serving Squarespace throughout.

Total time: about 30 minutes, most of it waiting.

**Where things stand (23 September 2026).** Steps 1, 2 and 4 are done. The site
is live at <https://wacochinesechurch.pages.dev> and rebuilds on every push to
`main`. What is left is step 3 (CMS sign-in), the contact-form key in step 2,
and steps 5 and 6, which are the church's call rather than a developer's.

---

## 1. Push to GitHub — 5 min

The repository is already initialised with one commit. Create an **empty**
repo on GitHub (no README, no .gitignore — this project has its own), then:

```bash
git remote add origin https://github.com/wacochinesechurch/website.git
git push -u origin main
```

If the org or repo name is different, change it in **two** places:

- the `git remote` line above
- `repo:` in `public/admin/config.yml` (line 29)

They must match or the CMS will not be able to save.

## 2. Connect Cloudflare Pages — 10 min ✅ done

**Why Cloudflare rather than Netlify.** Netlify now prices by credits, and a
production deploy costs a flat 15 of them against 300 a month on the free
plan. That is twenty deploys a month, for a site whose HTML is identical
whether it took one second or one minute to build. Twenty went in a single
afternoon of edits, and deploys then stopped with five commits unpublished
and the site frozen on an older version. The daily rebuild in section 4 made
it worse: 15 credits a day is 450 a month, so the free plan could never have
survived a month even with nobody touching the repo.

Cloudflare Pages counts builds, not deploys: 500 a month free, with unlimited
bandwidth and requests. The same daily rebuild is about 6% of that.

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect
to Git** → pick `wacochinesechurch/website`. Then:

| Setting | Value |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | read from `.node-version` (22) |

Headers and redirects need no configuration: `public/_headers` and
`public/_redirects` are copied into `dist` and Cloudflare reads both, exactly
as Netlify did. That is deliberate, so the site is not welded to either host.

The project is named `wacochinesechurch`, which makes the URL
<https://wacochinesechurch.pages.dev>. **That is the staging URL.** The real
domain still points at Squarespace and stays there until the church has looked
at this one. Pushing to `main` deploys; pushing any other branch builds a
preview at `<branch>.wacochinesechurch.pages.dev`, which is the cheapest way to
check a change against the real build environment.

Canonical URLs, the sitemap and `og:url` all point at
`www.wacochinesechurch.org`, not at `pages.dev`. That is correct and
deliberate: it tells search engines the staging copy is not the original, so
the two never compete in the index.

### What does not come across

**The contact form.** It used to post to Netlify Forms, which exists only on
Netlify. It now posts to Web3Forms, which is free and needs no account: enter
the church's address at web3forms.com and an access key arrives by email. Put
it in `src/content/settings/church.yaml` under `contact.formKey`. The key is
public by design, because it can only ever send to the address it was
registered to.

The key needs someone who can open the church's inbox and click a confirmation
link; there is no way around that, and there should not be — it is the only
thing stopping anyone pointing a form at anyone's address. Until then **the
form simply does not render.** The contact page leads with the email address at
display size instead, which is how the rest of the site asks people to get in
touch anyway. `npm run preflight` says the form is off and passes. Switching it
on later is one line in `church.yaml`, editable from the CMS, with no code
change. Preflight still fails hard if a placeholder key ever reaches a rendered
page, which is the case that must never ship.

**Language negotiation at `/`.** The old `_redirects` had a rule keyed on
Accept-Language. Cloudflare cannot do conditional redirects, and the rule was
only ever a fallback: the gate page does the negotiation, and does it better,
because it can read the visitor's saved choice. The rule is gone and nothing
was lost.

## 3. Turn on CMS sign-in — 15 min

`/admin` loads without this, but nobody can sign in. That has been true since
the beginning; it was never switched on.

Netlify used to offer a free OAuth broker at `api.netlify.com/auth`, which is
why the CMS config had no `base_url`. That route went with the move. The
replacement runs on the same Cloudflare account:

1. Deploy <https://github.com/sveltia/sveltia-cms-auth>. It is a Cloudflare
   Worker and its README is a single command. You get a URL like
   `https://sveltia-cms-auth.<subdomain>.workers.dev`.
2. Register a GitHub OAuth app at
   <https://github.com/settings/applications/new>:

   | Field | Value |
   |---|---|
   | Application name | Waco Chinese Church CMS |
   | Homepage URL | `https://www.wacochinesechurch.org` |
   | Authorization callback URL | `<worker URL>/callback` — exactly this |

3. Put the client ID and secret into the Worker's environment variables, as
   its README describes. **They never go into this repository.**
4. Uncomment `base_url` at the bottom of the `backend:` block in
   `public/admin/config.yml` and point it at the Worker. Commit and push.

Volunteers then sign in at `/admin` with a free GitHub account. They also need
**write access to the repository**, or they can sign in but not save.

## 4. The nightly rebuild — 2 min ✅ done

A static site built in February still believes it is February. The browser-side
guard in `src/scripts/freshness.ts` keeps *visitors* seeing the right thing,
but the HTML **Google and link previews** see only updates when the site
rebuilds.

`.github/workflows/nightly-rebuild.yml` runs at 09:00 UTC (about 4am in Waco)
and POSTs to a deploy hook. It is wired up and has been tested end to end: the
hook is the Cloudflare Pages one named `nightly-rebuild`, and the repository
secret `DEPLOY_HOOK_URL` holds its URL.

To rebuild that wiring from scratch, or to point it at a different host:

1. Cloudflare → the Pages project → **Settings → Build → Deploy hooks** → *Add
   deploy hook*, branch `main`. Copy the URL. (On Netlify the equivalent is
   **Build & deploy → Build hooks**.)
2. GitHub → the repo → **Settings → Secrets and variables → Actions** → *New
   repository secret*, named exactly `DEPLOY_HOOK_URL`, with that URL. The
   workflow still falls back to the older `NETLIFY_BUILD_HOOK` name if that is
   all it finds, so nothing breaks mid-move.

The workflow fails loudly if neither secret is set, rather than quietly doing
nothing — a silent cron job is worse than none. You can trigger it by hand from
the repo's **Actions** tab. A green tick there only means the hook was
*accepted*; confirm a new deployment actually appears in Cloudflare's
**Deployments** list before believing it.

Cost: one build a day out of 500 free a month, about 6%.

This is the third of three layers that stop this site going stale the way the
last one did.

## 5. Before switching the domain

- [ ] `npm run build && npm run preflight` passes
- [ ] Work through `/en/review` — 25 items, and the ones at the top are the
      ones a visitor actually trips over. The page used to under-report: two
      of its eight loops tested `=== 'unverified'` while the rest tested
      `!== 'verified'`, so published-but-unconfirmed content never appeared
      and the mission statement was live while listed nowhere. Fixed. The
      fuller list, as sent to the church, runs to 45 questions — the review
      page can only see what is flagged in the repository, and a good many of
      those 45 are about things outside it
- [ ] Confirm someone watches **wacochinesechurch@gmail.com**. It is the only
      contact route, and it now also receives requests for the Wednesday
      prayer meeting address
- [ ] Add one real item to **Notices** or **Events** so "What's coming up" is
      not empty on day one
- [ ] Check the photographs with the people in them, especially the homepage
      hero

## 6. Switching the domain

In Cloudflare: the Pages project → **Custom domains → Set up a domain** →
`www.wacochinesechurch.org`. Cloudflare shows the DNS record to set; change it
at your registrar (this is where Squarespace currently points). The certificate
issues automatically within a few minutes.

Nothing in the site's code needs to change: `site:` in `astro.config.mjs` has
pointed at `www.wacochinesechurch.org` from the beginning, so canonical URLs,
the sitemap and share cards are already correct on the day the DNS moves.

`public/_redirects` already maps every old Squarespace URL — `/about`,
`/fellowship`, `/new-page`, `/giving`, `/contacts`, `/latest-announcement`,
`/sermons`, `/church-life`, `/donate`, `/cart` — to its new home, so years of
existing links, bookmarks and search results keep working. Language
negotiation at `/` is not done here; it is the gate page's job, for the
reasons in the `_redirects` comment.

Afterwards, submit `https://www.wacochinesechurch.org/sitemap-index.xml` in
Google Search Console.

---

## If something looks wrong after deploy

**Chinese renders in the wrong font.** The subsets are committed to the repo,
so this should not happen — but if new Chinese copy was added without running
`npm run fonts`, those characters fall back to a system font. Harmless, and
fixed by rebuilding the subsets.

**An old event is showing as upcoming.** The nightly rebuild is not running.
See step 4.

**The CMS says it cannot save.** `repo:` in `config.yml` does not match the
actual repository, or the OAuth worker is not reachable.

**A page 404s that should not.** Cloudflare Pages serves
`dist/en/about/index.html` at `/en/about/` and redirects `/en/about` to it. If
you see a 404 on another host, check it is configured for directory-style URLs.

**Every click seems to take an extra round-trip.** Internal links must end in a
trailing slash, because that is the URL the host serves — the slash-free form
is a 308. Everything goes through `localePath()` in `src/i18n/config.ts`, and
`npm run preflight` fails on any page link that has lost its slash, so this
should not be able to come back quietly.

**`npm run build` fails with `ERR_DLOPEN_FAILED` about rollup.** `node_modules`
was installed by an x86 Node on an Apple Silicon Mac, so the native rollup
binary is the wrong architecture. Delete `node_modules` and reinstall with a
Node that matches the machine. Cloudflare installs cleanly on every build, so
this only ever affects a local checkout.
