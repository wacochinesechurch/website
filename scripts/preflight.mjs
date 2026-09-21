/**
 * Pre-deploy checks.
 *
 *   npm run build && npm run preflight
 *
 * Fails loudly on anything that would be embarrassing in public: a dead
 * internal link, a leftover placeholder, a page with no description, a
 * stale event presented as upcoming, a missing translation.
 *
 * Re-run this before any future launch. It is cheap and it has already
 * caught things a human review missed.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const problems = [];
const warnings = [];
const notes = [];

const fail = (m) => problems.push(m);
const warn = (m) => warnings.push(m);
const note = (m) => notes.push(m);

/* ---------------------------------------------------------------- helpers */
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};

if (!existsSync(DIST)) {
  console.error('No dist/ — run `npm run build` first.');
  process.exit(1);
}

const files = walk(DIST);
const pages = files.filter((f) => f.endsWith('.html'));
const read = (f) => readFileSync(f, 'utf8');
const strip = (h) =>
  h.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ');

/* --------------------------------------------------------------- 1. links */
const routes = new Set(
  pages.map((f) => {
    const r = '/' + relative(DIST, f).replace(/\\/g, '/');
    return r.replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/';
  }),
);
routes.add('/');

const assets = new Set(
  files.map((f) => '/' + relative(DIST, f).replace(/\\/g, '/')),
);

let linkCount = 0;
for (const f of pages) {
  const html = read(f);
  const page = '/' + relative(DIST, f).replace(/\\/g, '/');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/.test(url)) continue;
    if (!url.startsWith('/')) continue;
    linkCount++;
    const clean = url.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
    if (routes.has(clean) || assets.has(clean) || assets.has(url)) continue;
    if (clean === '/admin') continue; // CMS shell, served as a directory
    fail(`dead internal link  ${page}  →  ${url}`);
  }
}
note(`checked ${linkCount} internal links across ${pages.length} pages`);

/* -------------------------------------------------------- 2. placeholders */
const PLACEHOLDERS = [
  ['OWNER/REPO', 'CMS repo not configured'],
  ['example.com', 'example.com URL left in'],
  ['change-me', 'placeholder URL left in'],
  ['lorem ipsum', 'lorem ipsum'],
  ['TODO', 'TODO left in output'],
  ['FIXME', 'FIXME left in output'],
  ['undefined', 'literal "undefined" rendered'],
  ['[object Object]', 'object stringified into output'],
  ['NaN', 'NaN rendered'],
];
for (const f of pages) {
  const text = strip(read(f));
  for (const [needle, label] of PLACEHOLDERS) {
    if (text.includes(needle)) fail(`${label}  in  ${relative(DIST, f)}`);
  }
}
// the CMS config is not a page, but it must not ship with the placeholder repo
if (existsSync('dist/admin/config.yml')) {
  const cfg = read('dist/admin/config.yml');
  if (cfg.includes('OWNER/REPO'))
    fail('public/admin/config.yml still has `repo: OWNER/REPO` — the CMS will not work');
  if (!/base_url:/.test(cfg))
    warn('public/admin/config.yml has no `base_url` — CMS sign-in needs the OAuth worker URL');
}

/* ------------------------------------------------------------- 3. SEO/meta */
for (const f of pages) {
  const html = read(f);
  const rel = relative(DIST, f);
  if (rel.startsWith('admin')) continue;
  const noindex = /name="robots"[^>]*noindex/.test(html);
  if (!/<title>[^<]{3,}<\/title>/.test(html)) fail(`no <title>  ${rel}`);
  if (!/name="description"\s+content="[^"]{20,}"/.test(html) && !noindex)
    fail(`no meta description  ${rel}`);
  if (!/rel="canonical"/.test(html) && !noindex) warn(`no canonical  ${rel}`);
  if (!/property="og:image"/.test(html) && !noindex) warn(`no og:image  ${rel}`);
  if (!/<html[^>]+lang="/.test(html)) fail(`no <html lang>  ${rel}`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1 && !rel.startsWith('admin')) fail(`${h1} <h1> elements  ${rel}`);
}

/* ------------------------------------------------ 4. bilingual completeness */
const enPages = pages.filter((f) => relative(DIST, f).startsWith('en/'));
for (const f of enPages) {
  const zh = f.replace(`${DIST}/en/`, `${DIST}/zh/`);
  if (!existsSync(zh)) fail(`English page has no Chinese counterpart: ${relative(DIST, f)}`);
}
const zhPages = pages.filter((f) => relative(DIST, f).startsWith('zh/'));
for (const f of zhPages) {
  const en = f.replace(`${DIST}/zh/`, `${DIST}/en/`);
  if (!existsSync(en)) fail(`Chinese page has no English counterpart: ${relative(DIST, f)}`);
}
// hreflang on every public page
for (const f of [...enPages, ...zhPages]) {
  const html = read(f);
  if (!/hreflang="zh-CN"/.test(html) || !/hreflang="en-US"/.test(html))
    fail(`incomplete hreflang  ${relative(DIST, f)}`);
}
note(`${enPages.length} English pages paired with ${zhPages.length} Chinese pages`);

/* ------------------------------------------------------- 5. stale content */
const now = Date.now();
for (const f of pages) {
  const html = read(f);
  for (const m of html.matchAll(/data-event-end="([^"]+)"/g)) {
    if (Date.parse(m[1]) < now)
      fail(`past event still in an UPCOMING list  ${relative(DIST, f)}  (${m[1]})`);
  }
  for (const m of html.matchAll(/data-expires="([^"]+)"/g)) {
    if (Date.parse(m[1]) < now)
      fail(`expired notice still rendered  ${relative(DIST, f)}  (${m[1]})`);
  }
}

/* ---------------------------------------------------------- 6. structured data */
for (const f of [`${DIST}/en/index.html`, `${DIST}/zh/index.html`]) {
  const m = read(f).match(/application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) { fail(`no JSON-LD  ${relative(DIST, f)}`); continue; }
  try {
    const d = JSON.parse(m[1]);
    if (d['@type'] !== 'Church') fail(`JSON-LD @type is ${d['@type']}  ${relative(DIST, f)}`);
    if (!d.address?.streetAddress) fail(`JSON-LD has no street address  ${relative(DIST, f)}`);
    if (!d.event?.length) warn(`JSON-LD lists no services  ${relative(DIST, f)}`);
  } catch {
    fail(`JSON-LD is not valid JSON  ${relative(DIST, f)}`);
  }
}

/* --------------------------------------------------------------- 7. assets */
for (const need of ['/favicon.svg', '/og-default.png', '/robots.txt', '/_redirects']) {
  if (!assets.has(need)) fail(`missing ${need}`);
}
if (!existsSync(`${DIST}/404.html`)) fail('no 404.html');
if (!files.some((f) => f.includes('sitemap'))) fail('no sitemap');

const fonts = files.filter((f) => f.endsWith('.woff2'));
if (!fonts.length) fail('no self-hosted fonts in dist/fonts');
const fontKB = fonts.reduce((a, f) => a + statSync(f).size, 0) / 1024;

/* ------------------------------------------------------------ 8. page weight */
const jsFiles = files.filter((f) => f.endsWith('.js'));
const jsKB = jsFiles.reduce((a, f) => a + statSync(f).size, 0) / 1024;
if (jsKB > 100) warn(`JavaScript is ${jsKB.toFixed(0)} KB — unexpectedly large for this site`);

const bigImages = files
  .filter((f) => /\.(png|jpe?g|webp|avif)$/.test(f) && !f.includes('/fonts/'))
  .filter((f) => statSync(f).size > 400 * 1024);
for (const f of bigImages)
  warn(`${(statSync(f).size / 1024).toFixed(0)} KB image  ${relative(DIST, f)}`);

/* ------------------------------------------------------------- 9. privacy */
const PRIVATE = [/\b\d{3,5}\s+(South|North|East|West|S\.|N\.|E\.|W\.)\s+\w+\s+(Street|St|Avenue|Ave)/i];
for (const f of pages) {
  const text = strip(read(f));
  for (const re of PRIVATE) {
    const m = text.match(re);
    // the church's own address is expected; anything else is not
    if (m && !m[0].includes('Gurley')) warn(`possible private address in ${relative(DIST, f)}: ${m[0]}`);
  }
}

/* ---------------------------------------------------------------- report */
const line = (s) => console.log(s);
line('');
line('─'.repeat(64));
line('  PRE-DEPLOY CHECK');
line('─'.repeat(64));
for (const n of notes) line(`  · ${n}`);
line(`  · fonts ${fontKB.toFixed(0)} KB, JavaScript ${jsKB.toFixed(1)} KB`);
line('');
if (warnings.length) {
  line(`  WARNINGS (${warnings.length}) — worth a look, not blocking`);
  for (const w of warnings) line(`    ⚠ ${w}`);
  line('');
}
if (problems.length) {
  line(`  BLOCKING (${problems.length})`);
  for (const p of problems) line(`    ✗ ${p}`);
  line('');
  line('  NOT READY TO DEPLOY');
  line('─'.repeat(64));
  process.exit(1);
}
line('  ✓ no blocking problems — ready to deploy');
line('─'.repeat(64));
