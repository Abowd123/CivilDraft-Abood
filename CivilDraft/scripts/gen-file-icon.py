#!/usr/bin/env python3
"""═══ أيقونةُ ملفّات .cdraft ═══  →  build/file-icon.ico  (16 · 32 · 48 · 256)

ورقةُ رسمٍ داكنة بزاويةٍ مطويّة وإطارٍ أزرق، تحمل شعارَ التطبيق المستخرَجَ من
build/icon.ico نفسِه (فلا يتباعد الشكلان)، وشريطَ «لوحة العنوان» أسفلَها.
كلُّ مقاسٍ يُرسَم على حِدة (لا تصغيرٌ من 256 وحده):
  256       الشعارُ كاملاً + شبكةٌ خافتة + شريط العنوان
  48        الشعارُ كاملاً + شريط العنوان بلا شبكة
  32        شعارٌ مبسَّط (سقفٌ وبيت) بخطٍّ أغلظ
  16        ورقةٌ + طيّةٌ + سقفٌ فقط

لا خطوطَ نظامٍ ولا اعتماديّاتٍ غيرَ Pillow؛ المخرجُ ICO بمداخل PNG.
التشغيل:  npm run icons:file        (أو python3 scripts/gen-file-icon.py) """
import struct, sys, io
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "build" / "icon.ico"
OUT = ROOT / "build" / "file-icon.ico"
SIZES = (16, 32, 48, 256)
SS = 4                                   # رفعُ العيّنات للحواف الناعمة

BLUE = (41, 158, 240, 255)               # #299EF0 — أزرق الشعار
BLUE_D = (24, 98, 160, 255)
WHITE = (255, 255, 255, 255)
TOP, BOT = (26, 47, 78), (13, 17, 28)    # تدرّج الخلفية نفسه في favicon.svg


def logo_art():
    """الشعار وحدَه شفّافَ الخلفية: ما هو أفتحُ من الخلفية الداكنة يبقى."""
    im = Image.open(SRC)
    big = im.ico.getimage((256, 256)).convert("RGBA")
    px = big.load()
    out = Image.new("RGBA", big.size, (0, 0, 0, 0))
    op = out.load()
    for y in range(big.height):
        for x in range(big.width):
            r, g, b, a = px[x, y]
            m = max(r, g, b)
            al = max(0.0, min(1.0, (m - 95) / 70.0))   # عتبةٌ تُسقط الشبكة الخافتة
            if al > 0 and a > 0:
                op[x, y] = (r, g, b, int(255 * al * a / 255))
    return out.crop((14, 14, 242, 242))


def vgrad(w, h, c0, c1):
    g = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(g)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3)) + (255,))
    return g


def page_geom(n):
    """ورقةٌ في مربّع n×n: (x0,y0,x1,y1,fold) — الطيّةُ في أعلى اليمين."""
    x0, x1 = n * 0.17, n * 0.83
    y0, y1 = n * 0.05, n * 0.95
    return x0, y0, x1, y1, n * 0.24


def draw(n, art):
    N = n * SS
    x0, y0, x1, y1, f = (v * SS for v in page_geom(n))
    small = n <= 16
    mid = n <= 32
    bw = max(1, round(N * (0.06 if small else 0.045 if mid else 0.028)))

    # شكلُ الورقة بالزاوية المقصوصة
    poly = [(x0, y0), (x1 - f, y0), (x1, y0 + f), (x1, y1), (x0, y1)]
    mask = Image.new("L", (N, N), 0)
    ImageDraw.Draw(mask).polygon(poly, fill=255)
    if not small:                                   # تدويرُ الزوايا الباقية
        rm = Image.new("L", (N, N), 0)
        ImageDraw.Draw(rm).rounded_rectangle([x0, y0, x1, y1], N * 0.045, fill=255)
        mask = ImageChops.multiply(mask, rm)

    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    body = vgrad(N, N, TOP, BOT)
    img.paste(body, (0, 0), mask)
    d = ImageDraw.Draw(img)

    # شبكةُ المخطّط الخافتة (256 وحده — في الأصغر تُعكّر الشعار)
    if n >= 256:
        step = N / 16
        gx = x0 + step
        while gx < x1:
            d.line([(gx, y0), (gx, y1)], fill=(95, 134, 189, 22), width=max(1, SS // 2))
            gx += step
        gy = y0 + step
        while gy < y1:
            d.line([(x0, gy), (x1, gy)], fill=(95, 134, 189, 22), width=max(1, SS // 2))
            gy += step
        img.putalpha(ImageChops.multiply(img.getchannel("A"), mask))
        d = ImageDraw.Draw(img)

    # الشعار
    if n >= 48:
        aw = int(N * 0.58)
        a = art.resize((aw, int(aw * art.height / art.width)), Image.LANCZOS)
        img.alpha_composite(a, (int((N - aw) / 2 + N * 0.005), int(N * 0.15)))
    else:
        # بيتٌ مبسَّط: سقفٌ + جدارٌ (مقاسُ 32) أو سقفٌ فقط (16)
        cx = (x0 + x1) / 2
        w = (x1 - x0) * (0.62 if mid else 0.7)
        top = y0 + (y1 - y0) * (0.30 if mid else 0.34)
        lw = max(SS, int(N * (0.075 if mid else 0.1)))
        d.line([(cx - w / 2, top + w * 0.28), (cx, top - w * 0.02), (cx + w / 2, top + w * 0.28)],
               fill=WHITE, width=lw, joint="curve")
        if mid:
            bt = top + w * 0.36
            d.rectangle([cx - w * 0.36, bt, cx + w * 0.36, bt + w * 0.34], outline=BLUE, width=lw)
            d.line([(cx, bt), (cx, bt + w * 0.34)], fill=BLUE, width=max(SS, lw // 2))

    # شريطُ «لوحة العنوان» أسفلَ الورقة
    if not small:
        bh = (y1 - y0) * (0.17 if n >= 48 else 0.14)
        by0 = y1 - bh - (y1 - y0) * 0.055
        pad = (x1 - x0) * 0.09
        d.rounded_rectangle([x0 + pad, by0, x1 - pad, by0 + bh], radius=N * 0.02, fill=BLUE)
        if n >= 48:
            lh = max(SS, int(bh * 0.14))
            for i, frac in enumerate((0.66, 0.42)):
                yy = by0 + bh * (0.34 + 0.32 * i)
                d.rectangle([x0 + pad * 2, yy - lh / 2, x0 + pad * 2 + (x1 - x0 - pad * 4) * frac, yy + lh / 2],
                            fill=WHITE)

    # الإطار + الطيّة
    d.line(poly + [poly[0]], fill=BLUE, width=bw, joint="curve")
    d.polygon([(x1 - f, y0), (x1 - f, y0 + f), (x1, y0 + f)], fill=BLUE_D, outline=BLUE)
    d.line([(x1 - f, y0), (x1 - f, y0 + f), (x1, y0 + f)], fill=BLUE, width=bw, joint="curve")

    return img.resize((n, n), Image.LANCZOS)


def write_ico(frames, path):
    blobs = []
    for im in frames:
        b = io.BytesIO()
        im.save(b, "PNG", optimize=True)
        blobs.append(b.getvalue())
    head = struct.pack("<HHH", 0, 1, len(frames))
    off = 6 + 16 * len(frames)
    ent = b""
    for im, bl in zip(frames, blobs):
        w = 0 if im.width >= 256 else im.width       # 0 ⇐ 256 في صيغة ICO
        ent += struct.pack("<BBBBHHII", w, w, 0, 0, 1, 32, len(bl), off)
        off += len(bl)
    path.write_bytes(head + ent + b"".join(blobs))


def main():
    if not SRC.exists():
        print("لا build/icon.ico — لا مصدرَ للشعار", file=sys.stderr)
        return 1
    art = logo_art()
    frames = [draw(n, art) for n in SIZES]
    write_ico(frames, OUT)
    print(f"✓ {OUT.relative_to(ROOT)} — {OUT.stat().st_size} بايت — مقاسات: {', '.join(map(str, SIZES))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
