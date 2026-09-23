# Deploying

Plan: **stage on a Netlify URL first, switch the domain once the church has
signed off.** Nothing about the current site breaks while you do this.

Total time: about 30 minutes, most of it waiting.

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

## 2. Connect Cloudflare Pages — 10 min

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

You will get a URL like `wacochinesechurch.pages.dev`. **That is the staging
URL.** The real domain still points at Squarespace and stays there until the
church has looked at this one.

### What does not come across

**The contact form.** It used to post to Netlify Forms, which exists only on
Netlify. It now posts to Web3Forms, which is free and needs no account: enter
the church's address at web3forms.com and an access key arrives by email. Put
it in `src/content/settings/church.yaml` under `contact.formKey`. The key is
public by design, because it can only ever send to the address it was
registered to.

Until you do that, `npm run preflight` **fails**. That is on purpose: the form
renders perfectly with the placeholder in place and throws every message
silently away, and this is the only contact route the church publishes.

**Language negotiation at `/`.** The old `_redirects` had a rule keyed on
Accept-Language. Cloudflare cannot do conditional redirects, and the rule was
only ever a fallback: the gate page does the negotiation, and does it better,
because it can read the visitor's saved choice. The rule is gone and nothing
was lost.

## 3. Turn on CMS sign-in — 10 min

`/admin` already loads. Nobody can sign in until this is done.

Because the site is on Netlify, no separate OAuth server is needed — Netlify
can be the OAuth provider. Two steps, and **both involve a secret, so they are
yours to do, not something to delegate.**

### a. Create a GitHub OAuth App

Go to **github.com → Settings → Developer settings → OAuth Apps → New OAuth App**
(<https://github.com/settings/applications/new>) and enter exactly:

| Field | Value |
|---|---|
| Application name | `Waco Chinese Church CMS` |
| Homepage URL | `https://www.wacochinesechurch.org` |
| Authorization callback URL | `https://api.netlify.com/auth/done` |

The callback URL must be exactly that, or sign-in fails with a redirect error.

Register it, then **Generate a new client secret**. GitHub shows the secret
once — copy it now along with the Client ID.

### b. Give them to Netlify

**Netlify → your project → Project configuration → Security → Authentication
providers → Install provider → GitHub**, then paste the Client ID and Client
Secret.

That is it. `public/admin/config.yml` needs no change: with `backend: github`
the CMS authenticates through `https://api.netlify.com/auth` by default, which
is what you have just configured.

### Check it

Open `https://<your-site>/admin`, click **Login with GitHub**, authorise. You
should land in the editor with Notices, Events, Church life photos and the
rest down the left-hand side. Make a trivial edit, save, and watch a deploy
start in Netlify.

If sign-in fails, it is almost always the callback URL — it must be
`https://api.netlify.com/auth/done`, not your own domain.

### Adding volunteers

Each volunteer needs a free GitHub account with **write access to the
repository** (GitHub → the `wacochinesechurch` org → People / the repo's
Settings → Collaborators). Without write access they can sign in but not save.

## 4. The nightly rebuild — 2 min, please do not skip

A static site built in February still believes it is February. The browser-side
guard in `src/scripts/freshness.ts` keeps *visitors* seeing the right thing,
but the HTML **Google and link previews** see only updates when the site
rebuilds.

**This is already set up.** `.github/workflows/nightly-rebuild.yml` runs at
09:00 UTC (about 4am in Waco) and asks Netlify to rebuild. It needs one secret:

1. Netlify → **Site configuration → Build & deploy → Build hooks** → *Add build
   hook*. Copy the URL it gives you.
2. GitHub → the repo → **Settings → Secrets and variables → Actions** → *New
   repository secret*, named exactly `NETLIFY_BUILD_HOOK`, with that URL.

The workflow fails loudly if the secret is missing, rather than quietly doing
nothing — a silent cron job is worse than none. You can trigger it by hand from
the repo's **Actions** tab to check it works.

This is the third of three layers that stop this site going stale the way the
last one did.

## 5. Before switching the domain

- [ ] `npm run build && npm run preflight` passes
- [ ] Work through `/en/review` — 30 items, and the ones at the top are the
      ones a visitor actually trips over
- [ ] Confirm someone watches **wacochinesechurch@gmail.com**. It is the only
      contact route, and it now also receives requests for the Wednesday
      prayer meeting address
- [ ] Add one real item to **Notices** or **Events** so "What's coming up" is
      not empty on day one
- [ ] Check the photographs with the people in them, especially the homepage
      hero

## 6. Switching the domain

In Netlify: **Domain management → Add a domain** → `www.wacochinesechurch.org`.
Netlify shows the DNS records to set; change them at your registrar (this is
where Squarespace currently points). Certificates issue automatically within a
few minutes.

`public/_redirects` already maps every old Squarespace URL — `/about`,
`/fellowship`, `/new-page`, `/giving`, `/contacts`, `/latest-announcement`,
`/sermons`, `/church-life`, `/donate`, `/cart` — to its new home, so years of
existing links, bookmarks and search results keep working. It also handles
`/` language negotiation at the edge.

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

**A page 404s that should not.** Netlify serves `/en/about` from
`dist/en/about/index.html` automatically. If you see this on another host,
check it is configured for directory-style URLs.
