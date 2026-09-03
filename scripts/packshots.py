#!/usr/bin/env python3
"""
Generates a labelled packshot SVG per product from the two master artworks.

The artwork is identical for every formula of a given form; only the label
lockup changes. Run after adding or renaming a product:

    python3 scripts/packshots.py
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "public" / "img"

# (slug, shelf label, product name, form descriptor, form)
PRODUCTS = [
    ("hair-growth",     "HAIR & SCALP", "Hair Growth",     "Botanical Oil",         "oil"),
    ("scalp-balance",   "HAIR & SCALP", "Scalp Balance",   "Botanical Oil",         "oil"),
    ("beard-care",      "HAIR & SCALP", "Beard Care",      "Botanical Oil",         "oil"),
    ("skin-clarity",    "SKIN & BODY",  "Skin Clarity",    "Botanical Oil",         "oil"),
    ("prostate-health", "MEN'S HEALTH", "Prostate Health", "Herbal Infusion Blend", "powder"),
    ("daily-balance",   "MEN'S HEALTH", "Daily Balance",   "Herbal Infusion Blend", "powder"),
    ("digestive-ease",  "DIGESTION",    "Digestive Ease",  "Herbal Infusion Blend", "powder"),
    ("evening-calm",    "REST & CALM",  "Evening Calm",    "Herbal Infusion Blend", "powder"),
]

def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def split_name(name: str, limit: int):
    """Wraps a name onto two lines only when it will not fit on one."""
    if len(name) <= limit or " " not in name:
        return [name]
    words = name.split()
    best, score = None, None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        s = max(len(a), len(b))
        if score is None or s < score:
            best, score = (a, b), s
    return list(best)

def fit(text: str, base: float, limit: int) -> float:
    """Shrinks the type just enough for a long word to stay inside the label."""
    return base if len(text) <= limit else round(base * limit / len(text), 1)

def build_oil(shelf, name, descriptor):
    lines = split_name(name, 12)
    size = fit(max(lines, key=len), 20, 12)
    if len(lines) == 1:
        block = f'<text x="200" y="362" font-size="{size}">{esc(lines[0])}</text>'
        desc_y = 386
    else:
        block = (f'<text x="200" y="352" font-size="{size}">{esc(lines[0])}</text>'
                 f'<text x="200" y="352" dy="{size * 1.15:.0f}" font-size="{size}">{esc(lines[1])}</text>')
        desc_y = 396
    return {
        "shelf": f'<text x="200" y="330" font-size="{fit(shelf, 6.4, 14)}" letter-spacing="2.4">{esc(shelf)}</text>',
        "name": block,
        "desc": f'<text x="200" y="{desc_y}" font-size="11" font-style="italic" fill="#4D5F55">{esc(descriptor)}</text>',
    }

def build_powder(shelf, name, descriptor):
    lines = split_name(name, 9)
    size = fit(max(lines, key=len), 29, 9)
    if len(lines) == 1:
        block = f'<text x="230" y="320" font-size="{size}" fill="#FDFBF6">{esc(lines[0])}</text>'
        desc_y = 358
    else:
        block = (f'<text x="230" y="303" font-size="{size}" fill="#FDFBF6">{esc(lines[0])}</text>'
                 f'<text x="230" y="338" font-size="{size}" fill="#FDFBF6">{esc(lines[1])}</text>')
        desc_y = 365
    return {
        "shelf": f'<text x="230" y="251" font-family="\'JetBrains Mono\',monospace" font-size="{fit(shelf, 6.6, 14)}" letter-spacing="2.6" fill="#C9A961">{esc(shelf)}</text>',
        "name": block,
        "desc": f'<text x="230" y="{desc_y}" font-family="Newsreader,Georgia,serif" font-size="12" font-style="italic" fill="#DFC98F">{esc(descriptor)}</text>',
    }

OIL_MASTER = (IMG / "packshot-oil.svg").read_text(encoding="utf-8")
POWDER_MASTER = (IMG / "packshot-powder.svg").read_text(encoding="utf-8")

written = 0
for slug, shelf, name, descriptor, form in PRODUCTS:
    if form == "oil":
        svg = OIL_MASTER
        parts = build_oil(shelf, name, descriptor)
        svg = re.sub(r'<text x="200" y="330"[^>]*>.*?</text>', parts["shelf"], svg, count=1)
        svg = re.sub(r'<text x="200" y="362"[^>]*>.*?</text>', parts["name"], svg, count=1)
        svg = re.sub(r'<text x="200" y="386"[^>]*>.*?</text>', parts["desc"], svg, count=1)
    else:
        svg = POWDER_MASTER
        parts = build_powder(shelf, name, descriptor)
        svg = re.sub(r'<text x="230" y="251"[^>]*>.*?</text>', parts["shelf"], svg, count=1)
        svg = re.sub(r'<text x="230" y="303"[^>]*>.*?</text>\s*<text x="230" y="338"[^>]*>.*?</text>',
                     parts["name"], svg, count=1)
        svg = re.sub(r'<text x="230" y="365"[^>]*>.*?</text>', parts["desc"], svg, count=1)

    svg = svg.replace('aria-label="Herbedia Hair Growth botanical oil in an amber glass dropper bottle"',
                      f'aria-label="Herbedia {esc(name)} in an amber glass dropper bottle"')
    svg = svg.replace('aria-label="Herbedia Prostate Health herbal blend in a matte deep-green stand-up pouch"',
                      f'aria-label="Herbedia {esc(name)} herbal blend in a matte deep-green stand-up pouch"')

    (IMG / f"pack-{slug}.svg").write_text(svg, encoding="utf-8")
    written += 1

print(f"wrote {written} packshots into {IMG.relative_to(ROOT)}")
