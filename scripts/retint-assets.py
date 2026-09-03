#!/usr/bin/env python3
"""
Retints the vector assets from the old brass/bottle-green identity to the
Herbedia violet + fern palette taken from the logo.

Kept deliberately: the amber glass of the oil bottle. Amber is what botanical
oils actually ship in, and turning it violet would look like a novelty bottle.
The pouch, cartons, foils and all rule work move to violet; botanical marks
move to the logo's fern green.
"""
import pathlib, re

IMG = pathlib.Path(__file__).resolve().parent.parent / "public" / "img"

MAP = {
    # brass foil / gold rules  ->  violet
    "#6E5426": "#2E1364", "#6B5124": "#2E1364", "#7C6330": "#34168A",
    "#8B6E31": "#3A1B95", "#9A7B3A": "#4927B7", "#B4924F": "#512BC7",
    "#C9A961": "#7B5FE0", "#DFC98F": "#B3A4EE", "#EFE3C4": "#DDD5F8",
    "#F0E0B6": "#D6CCF7", "#F2E4BC": "#DDD5F8",

    # deep bottle-green pouch / cap  ->  deep violet
    "#020B07": "#0A0320", "#031009": "#120833", "#040F0A": "#0E0628",
    "#050F0A": "#0E0628", "#051710": "#150A3C", "#06170F": "#150A3C",
    "#061A13": "#170B42", "#0A2118": "#1B0C4A", "#0A2A1E": "#1F0E55",
    "#0C2B21": "#1F0E55", "#0D3025": "#241062", "#0E3126": "#241062",
    "#0F3226": "#26105F", "#02100B": "#0A0320", "#03110C": "#0A0320",
    "#12362A": "#26105F", "#123829": "#26105F", "#14402F": "#2E1364",
    # the "HERBEDIA" wordmark printed on the labels takes the logo violet
    "#12382B": "#512BC7",
    "#173D2C": "#2C1370", "#1A4B37": "#34168A", "#1C513C": "#3A1B95",
    "#1D5240": "#3A1B95", "#235E48": "#4522A8", "#25654A": "#4927B7",
    "#2A5F45": "#4522A8", "#08221A": "#1B0C4A",

    # foliage / botanical marks  ->  the logo's fern green
    "#4F7355": "#3A6B2C", "#3E6349": "#29511F", "#3B7A5E": "#749567",
    "#8FA79A": "#A6C199",

    # paper + ink neutrals  ->  the violet-cast set
    "#08201A": "#120833", "#14231C": "#16112B", "#2E4038": "#302A46",
    "#4D5F55": "#524A68", "#6F8076": "#7A7292", "#E3DACA": "#E5E0F2",
    "#CFC2A9": "#C9C1E4", "#C9BFA6": "#C9C1E4", "#C0B296": "#C9C1E4",
    "#B3A488": "#B4A9DA", "#D9CFB8": "#DFD9F1", "#E4DBC7": "#EDE9F8",
    "#E5DAC4": "#DFD9F1", "#DED3BC": "#DFD9F1", "#EFE7D6": "#F0EDFB",
    "#F4EEE0": "#F6F4FC", "#F7F2E6": "#F6F4FC", "#FBF7EC": "#FCFBFE",
    "#FCFAF4": "#FCFBFE", "#FDFBF6": "#FCFBFE", "#EFE8D9": "#EDE9F8",
}
# amber glass of the oil bottle — intentionally untouched
KEEP = {"#3A1704", "#7E3A0C", "#C0731F", "#E2A551", "#AE5F16", "#642C08",
        "#2E1103", "#2E1204", "#3A1806"}

pat = re.compile("|".join(sorted(MAP, key=len, reverse=True)), re.I)
changed = 0
for f in sorted(IMG.glob("*.svg")):
    src = f.read_text(encoding="utf-8")
    out = pat.sub(lambda m: MAP[m.group(0).upper()], src)
    if out != src:
        f.write_text(out, encoding="utf-8")
        changed += 1

left = set()
for f in IMG.glob("*.svg"):
    for h in re.findall(r"#[0-9A-Fa-f]{6}", f.read_text(encoding="utf-8")):
        h = h.upper()
        if h in MAP or h in MAP.values() or h in KEEP:
            continue
        left.add(h)
print(f"retinted {changed} assets")
print("unmapped (expected: amber + pure tones):", sorted(left) or "none")
