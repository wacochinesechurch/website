#!/usr/bin/env python3
"""
Generate public/og-default.png, the card attached to every shared link.

WHY THIS SCRIPT EXISTS
The previous card was made by hand. That meant it could not track the facts,
and it didn't: after the church asked for "Avenue" to be spelled out and for
interpretation to be described as offered rather than as the service being
bilingual, the card was the last place on the whole site still saying
"1801 Gurley Ave" and 「中英双语」. It is also the single asset most likely to
be sent to a visiting speaker.

So the card is generated, and it reads the address and the Sunday time out of
src/content/settings/church.yaml. Change a fact there and regenerate; the card
cannot drift from the site again.

    python3 scripts/make-og-image.py

Needs: pillow, fonttools, brotli, and the @fontsource packages (npm i).
"""
import io, os, re, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FS = os.path.join(ROOT, 'node_modules/@fontsource')
OUT = os.path.join(ROOT, 'public/og-default.png')
PHOTO = os.path.join(ROOT, 'src/assets/moments/midautumn-gathering.webp')

W, H = 1200, 630
PAPER, AMBER, INK, MUTED = '#f8f4ed', '#e0a455', '#14110e', '#d6ccc1'

FONTS = {
    'serif600': f'{FS}/source-serif-4/files/source-serif-4-latin-600-normal.woff2',
    'sans600':  f'{FS}/source-sans-3/files/source-sans-3-latin-600-normal.woff2',
    'sc600':    f'{FS}/noto-serif-sc/files/noto-serif-sc-chinese-simplified-600-normal.woff2',
    'sc400':    f'{FS}/noto-serif-sc/files/noto-serif-sc-chinese-simplified-400-normal.woff2',
}

def to_ttf(woff2, tmp):
    """PIL cannot read woff2; fontTools can convert it."""
    from fontTools.ttLib import TTFont
    out = os.path.join(tmp, os.path.basename(woff2).replace('.woff2', '.ttf'))
    f = TTFont(woff2)
    f.flavor = None
    f.save(out)
    return out

def church_facts():
    """Read the address and Sunday time from the single source of truth."""
    y = io.open(os.path.join(ROOT, 'src/content/settings/church.yaml'), encoding='utf-8').read()
    line1 = re.search(r'^\s*line1:\s*(.+)$', y, re.M).group(1).strip()
    city  = re.search(r'^\s*city:\s*(.+)$', y, re.M).group(1).strip()
    start = re.search(r'^\s*startTime:\s*"(\d\d):(\d\d)"', y, re.M)
    h, m = int(start.group(1)), int(start.group(2))
    ampm = 'a.m.' if h < 12 else 'p.m.'
    h12 = h if 1 <= h <= 12 else abs(h - 12)
    clock = f'{h12}:{m:02d} {ampm}' if m else f'{h12} {ampm}'
    return line1, city, clock

def main():
    line1, city, clock = church_facts()
    with tempfile.TemporaryDirectory() as tmp:
        ttf = {k: to_ttf(v, tmp) for k, v in FONTS.items()}
        F = lambda k, s: ImageFont.truetype(ttf[k], s)

        # Photograph, cover-cropped to the card.
        photo = Image.open(PHOTO).convert('RGB')
        scale = max(W / photo.width, H / photo.height)
        photo = photo.resize((round(photo.width * scale), round(photo.height * scale)), Image.LANCZOS)
        img = photo.crop((0, 0, W, H))

        # Dark wash. It holds nearly solid across the left two thirds, where
        # every word sits, and only then lets the photograph come up. A gentle
        # linear fade is not enough: the wordmark runs to x=890, and the room
        # behind it is bright, so the last word was landing on near-white.
        wash = Image.new('RGBA', (W, H))
        wd = ImageDraw.Draw(wash)
        for x in range(W):
            t = x / W
            if t < 0.46:
                a = 250
            else:
                k = (t - 0.46) / 0.54
                a = 250 - 132 * (k ** 1.35)
            wd.line([(x, 0), (x, H)], fill=(20, 17, 14, int(a)))
        img = Image.alpha_composite(img.convert('RGBA'), wash).convert('RGB')

        d = ImageDraw.Draw(img)
        X = 84

        # The arch, redrawn from public/favicon.svg at 4.55x its 32px viewBox.
        s, ox, oy = 3.15, X, 168
        def P(x, y): return (ox + x * s, oy + y * s)
        d.arc([P(1.6, 0.8)[0], P(1.6, 0.8)[1], P(22.4, 21.6)[0], P(22.4, 21.6)[1]],
              180, 360, fill=PAPER, width=round(2.2 * s))
        d.line([P(1.6, 11.2), P(1.6, 25.4)], fill=PAPER, width=round(2.2 * s))
        d.line([P(22.4, 11.2), P(22.4, 25.4)], fill=PAPER, width=round(2.2 * s))
        d.pieslice([P(7.9, 8.4)[0], P(7.9, 8.4)[1], P(16.1, 16.6)[0], P(16.1, 16.6)[1]],
                   180, 360, fill=AMBER)
        d.rectangle([P(7.9, 12.5), P(16.1, 25.4)], fill=AMBER)
        d.line([P(0.4, 25.4), P(25.2, 25.4)], fill=PAPER, width=round(2.2 * s))

        d.text((X, 288), 'Waco Chinese Church', font=F('serif600', 74), fill=PAPER)

        # 韦科华人教会, letter-spaced by hand because PIL has no tracking.
        zx, zf = X, F('sc600', 46)
        for ch in '韦科华人教会':
            d.text((zx, 378), ch, font=zf, fill=AMBER)
            zx += zf.getlength(ch) + 9

        d.rectangle([X, 474, X + 46, 477], fill=AMBER)

        d.text((X, 496), f'Sundays {clock} · {line1}, {city}, Texas',
               font=F('sans600', 26), fill=PAPER)
        d.text((X, 538), '主日上午十一点 · 华语敬拜，提供英文翻译',
               font=F('sc400', 23), fill=MUTED)

        img = img.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
        img.save(OUT, 'PNG', optimize=True)

    kb = os.path.getsize(OUT) / 1024
    print(f'  wrote {os.path.relpath(OUT, ROOT)}  {W}x{H}  {kb:.0f} KB')
    print(f'  address read from church.yaml: {line1}, {city}')
    print(f'  Sunday time read from church.yaml: {clock}')

if __name__ == '__main__':
    main()
