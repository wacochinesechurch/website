"""Subset the web fonts to the glyphs the rendered site actually uses."""
import glob, html, os, re, subprocess, sys

def cjk_and_all(paths):
    chars = set()
    for p in paths:
        h = open(p, encoding="utf-8").read()
        h = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", h, flags=re.S)
        chars |= set(html.unescape(re.sub(r"<[^>]+>", " ", h)))
    return chars

if not glob.glob("dist/**/*.html", recursive=True):
    sys.exit("No dist/ found — run `npm run build` first.")

en = [p for p in glob.glob("dist/en/**/*.html", recursive=True) if "/review/" not in p]
zh = [p for p in glob.glob("dist/zh/**/*.html", recursive=True) if "/review/" not in p]
extra = set(chr(i) for i in range(0x20, 0x7F)) | set(
    "‘’“”—–…·×÷°′″©®™•§¶　，。、；：？！（）【】《》「」『』〈〉～￥％０１２３４５６７８９")

is_cjk = lambda c: "一" <= c <= "鿿" or "　" <= c <= "〿" or "＀" <= c <= "￯"
brand = {c for c in cjk_and_all(en) if is_cjk(c)}
full = {c for c in cjk_and_all(zh) if is_cjk(c)} | brand
rest = full - brand
latin = (cjk_and_all(en) | cjk_and_all(zh) | extra) - full
latin = {c for c in latin if ord(c) > 0x1F}

# ---------------------------------------------------------------- sans ---
# Chinese in the INTERFACE (nav, buttons, labels, eyebrows, form fields) is set
# in the sans stack, and no Chinese sans was self-hosted at all: the stack
# named 'Noto Sans SC' but nothing ever loaded it, so every one of those
# strings fell through to whatever the device happened to have. PingFang on a
# Mac and an iPad, Microsoft YaHei on Windows, something else on Android. That
# is why the site looked different on every screen it was opened on.
#
# Only these glyphs need it, so the subset stays small. The set is derived,
# not hand-listed: find every selector in the source that asks for --font-ui,
# then collect the Chinese inside those elements in the built HTML. Anything
# missed still falls back to the system font, which is exactly today's
# behaviour, so a miss costs nothing.
from html.parser import HTMLParser

ui_tokens = set()
for _p in glob.glob("src/**/*.astro", recursive=True) + glob.glob("src/**/*.css", recursive=True):
    _t = open(_p, encoding="utf-8").read()
    for m in re.finditer(r"font-family:\s*var\(--font-(?:ui|sans)\)", _t):
        block = _t[max(0, m.start() - 400):m.start()].rsplit("}", 1)[-1]
        ui_tokens |= set(re.findall(r"\.([A-Za-z][\w-]*)", block))
ui_tokens -= {"astro"}

class _SansText(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack = []; self.chars = set()
    def handle_starttag(self, tag, attrs):
        if tag in ("br", "img", "input", "meta", "link", "hr", "source"): return
        cls = dict(attrs).get("class") or ""
        self.stack.append(bool(ui_tokens & set(cls.split())))
    def handle_endtag(self, tag):
        if self.stack: self.stack.pop()
    def handle_data(self, data):
        if any(self.stack):
            self.chars |= {c for c in data if is_cjk(c)}

sans = set()
for _page in zh:
    _parser = _SansText()
    _body = re.sub(r"<(script|style)[^>]*>.*?</\1>", "",
                   open(_page, encoding="utf-8").read(), flags=re.S)
    try: _parser.feed(_body)
    except Exception: pass
    sans |= _parser.chars
sans |= {c for c in open("src/i18n/ui.ts", encoding="utf-8").read() if is_cjk(c)}

for name, chars in (("brand", brand), ("rest", rest), ("latin", latin), ("sans", sans)):
    open(f"/tmp/wcc-{name}.txt", "w", encoding="utf-8").write("".join(sorted(chars)))
print(f"  glyphs — latin {len(latin)}, CJK on /en {len(brand)}, CJK zh-only {len(rest)}, CJK in UI {len(sans)}")

def urange(chars):
    cps = sorted(ord(c) for c in chars); out = []; i = 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1: j += 1
        out.append(f"U+{cps[i]:04X}" if i == j else f"U+{cps[i]:04X}-{cps[j]:04X}")
        i = j + 1
    return ",".join(out)

FS = "node_modules/@fontsource"
JOBS = [
    ("noto-serif-sc-brand-400", f"{FS}/noto-serif-sc/files/noto-serif-sc-chinese-simplified-400-normal.woff2", "Noto Serif SC", 400, "normal", "brand"),
    ("noto-serif-sc-rest-400",  f"{FS}/noto-serif-sc/files/noto-serif-sc-chinese-simplified-400-normal.woff2", "Noto Serif SC", 400, "normal", "rest"),
    ("noto-serif-sc-brand-600", f"{FS}/noto-serif-sc/files/noto-serif-sc-chinese-simplified-600-normal.woff2", "Noto Serif SC", 600, "normal", "brand"),
    ("noto-serif-sc-rest-600",  f"{FS}/noto-serif-sc/files/noto-serif-sc-chinese-simplified-600-normal.woff2", "Noto Serif SC", 600, "normal", "rest"),
    ("source-serif-4-400",  f"{FS}/source-serif-4/files/source-serif-4-latin-400-normal.woff2", "Source Serif 4", 400, "normal", "latin"),
    ("source-serif-4-600",  f"{FS}/source-serif-4/files/source-serif-4-latin-600-normal.woff2", "Source Serif 4", 600, "normal", "latin"),
    ("source-serif-4-400i", f"{FS}/source-serif-4/files/source-serif-4-latin-400-italic.woff2", "Source Serif 4", 400, "italic", "latin"),
    # Two weights only. CJK at interface sizes barely distinguishes 500 from
    # 400, or 700 from 600, and CSS font matching maps them for us: 500
    # resolves to 400 and 700 to 600. Four weights would cost twice this
    # for a difference nobody can see.
    ("noto-sans-sc-ui-400", f"{FS}/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff2", "Noto Sans SC", 400, "normal", "sans"),
    ("noto-sans-sc-ui-600", f"{FS}/noto-sans-sc/files/noto-sans-sc-chinese-simplified-600-normal.woff2", "Noto Sans SC", 600, "normal", "sans"),
    ("source-sans-3-400",   f"{FS}/source-sans-3/files/source-sans-3-latin-400-normal.woff2", "Source Sans 3", 400, "normal", "latin"),
    ("source-sans-3-600",   f"{FS}/source-sans-3/files/source-sans-3-latin-600-normal.woff2", "Source Sans 3", 600, "normal", "latin"),
    ("source-sans-3-700",   f"{FS}/source-sans-3/files/source-sans-3-latin-700-normal.woff2", "Source Sans 3", 700, "normal", "latin"),
]
SETS = {"brand": brand, "rest": rest, "latin": latin, "sans": sans}
os.makedirs("public/fonts", exist_ok=True)
for f in glob.glob("public/fonts/*.woff2"): os.remove(f)

css = ("/* Generated by scripts/subset-fonts.py — do not edit by hand.\n"
       "   Regenerate: npm run build && npm run fonts && npm run build\n"
       "   Glyphs outside these subsets fall back to the system Chinese font\n"
       "   already in the stack, never to tofu. */\n\n")
total = 0
for name, src, family, weight, style, which in JOBS:
    if not os.path.exists(src):
        print(f"  ✗ missing source {src}"); continue
    out = f"public/fonts/{name}.woff2"
    # CJK needs two features the Latin faces do not, and losing them is
    # invisible until you look at a large heading and wonder why it reads
    # badly. `chws` is contextual half-width spacing: it is what compresses
    # the empty half of a full-width 。or ，so a Chinese line does not open a
    # hole after every stop. `halt` supplies the half-width forms it needs to
    # do that. The old list omitted both, so every Chinese heading on this
    # site has been set without punctuation compression from the beginning.
    cjk = which in ("brand", "rest", "sans")
    feats = ("kern,liga,calt,locl,ccmp,mark,chws,halt" if cjk
             else "kern,liga,calt,locl")
    r = subprocess.run([sys.executable, "-m", "fontTools.subset", src,
                        f"--text-file=/tmp/wcc-{which}.txt", "--flavor=woff2",
                        f"--layout-features={feats}", "--desubroutinize",
                        "--no-hinting", f"--output-file={out}"], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ✗ {name}: {r.stderr[-160:]}"); continue
    total += os.path.getsize(out)
    print(f"  ✓ {name}.woff2  {os.path.getsize(out)/1024:6.1f} KB")
    css += (f"@font-face {{\n  font-family: '{family}';\n  font-style: {style};\n"
            f"  font-weight: {weight};\n  font-display: swap;\n"
            f"  src: url('/fonts/{name}.woff2') format('woff2');\n")
    if which in ("brand", "rest", "sans"):
        css += f"  unicode-range: {urange(SETS[which])};\n"
    css += "}\n\n"
open("src/styles/fonts.css", "w", encoding="utf-8").write(css)
print(f"\n  total {total/1024:.1f} KB across {len(JOBS)} faces")
