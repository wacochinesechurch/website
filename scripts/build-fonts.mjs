/**
 * Regenerate the self-hosted font subsets.
 *
 *   npm run build && npm run fonts && npm run build
 *
 * The first build renders the pages; this script reads the glyphs actually
 * present in them; the second build picks up the new fonts.css. Run it after
 * adding a substantial amount of new Chinese copy — not after every edit,
 * because anything outside the subset falls back to the system Chinese font
 * (PingFang SC / Microsoft YaHei / Songti SC) rather than to tofu.
 *
 * WHY SELF-HOST: Google Fonts was measured serving 1.8 MB on /en and 2.7 MB on
 * /zh, plus a 227 KB render-blocking stylesheet with 202 @font-face blocks. It
 * chunks the CJK faces into ~100 generic buckets and this site's text lands in
 * dozens of them. Subsetting to the ~680 characters the church has written
 * brings that to 70 KB and 293 KB, with no third-party request.
 *
 * REQUIRES: python3 with fonttools + brotli, and the @fontsource packages:
 *   python3 -m pip install --user fonttools brotli
 *   npm install --no-save @fontsource/noto-serif-sc @fontsource/source-serif-4 @fontsource/source-sans-3
 */
import { spawnSync } from 'node:child_process';

const r = spawnSync('python3', ['scripts/subset-fonts.py'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
