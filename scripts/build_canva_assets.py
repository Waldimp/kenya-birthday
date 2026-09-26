"""Descarga los assets de Canva y genera el layout para la app.

Entradas (en .playwright-mcp/, producidas desde el editor de Canva):
  canva-layout.json  -> posiciones/tamaños/rotaciones (scripts/canva_extract.js)
  canva-srcs.json    -> uri -> URL firmada de mayor resolución

Salidas:
  public/canva/<pagina>/<nombre>.webp   (cada elemento ya recortado como en Canva)
  src/lib/canva-layout.ts               (layout en unidades de página)
"""

from __future__ import annotations

import hashlib
import html

import json
import pathlib
import re
import subprocess

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORK = ROOT / ".playwright-mcp"
RAW = WORK / "raw"
OUT = ROOT / "public" / "canva"
RAW.mkdir(parents=True, exist_ok=True)

layout = json.loads((WORK / "canva-layout.json").read_text(encoding="utf-8"))
srcs = json.loads((WORK / "canva-srcs.json").read_text(encoding="utf-8"))

PAPER = "41cb38e5-3396-4dcd-94b3-88e4253e4183"
# Resolución objetivo: 2.2 px por unidad de página (pantallas retina en escritorio).
PX_PER_UNIT = 2.2


def fetch(uri: str) -> Image.Image:
    path = RAW / f"{uri}.png"
    if not path.exists():
        url = html.unescape(srcs[uri]["src"])
        subprocess.run(
            ["curl", "-sf", "-o", str(path), url, "-H", "Referer: https://www.canva.com/"],
            check=True,
        )
    return Image.open(path).convert("RGBA")


def parse_translate(t: str) -> tuple[float, float]:
    m = re.search(r"translate\(([-\de.]+)px,\s*([-\de.]+)px\)", t or "")
    return (float(m.group(1)), float(m.group(2))) if m else (0.0, 0.0)


def crop_element(img: Image.Image, e: dict) -> Image.Image:
    """Aplica el recorte de Canva: el img interno mide crop.w x crop.h y se
    desplaza (tx, ty) dentro de la caja del elemento (w x h)."""
    crop = e.get("crop")
    sx = e.get("sx", 1) or 1
    if not crop:
        return img
    cw, ch = crop["w"] / sx, crop["h"] / sx
    w, h = e["w"] / sx, e["h"] / e.get("sy", sx)
    tx, ty = parse_translate(crop["transform"])
    fx, fy = img.width / cw, img.height / ch
    box = (-tx * fx, -ty * fy, (-tx + w) * fx, (-ty + h) * fy)
    box = tuple(round(v) for v in box)
    return img.crop(box)


def export(page: str, e: dict, img: Image.Image) -> str:
    target_w = max(1, round(e["w"] * PX_PER_UNIT))
    target_h = max(1, round(e["h"] * PX_PER_UNIT))
    if img.width > target_w:
        img = img.resize((target_w, target_h), Image.LANCZOS)
    else:
        img = img.resize((img.width, max(1, round(img.width * e["h"] / e["w"]))), Image.LANCZOS)
    key = hashlib.sha1(img.tobytes()).hexdigest()[:10]
    name = f"{e['uri'][:8]}-{key}.webp"
    dest = OUT / page / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        img.save(dest, "WEBP", quality=90, method=6)
    return f"/canva/{page}/{name}"


def build(page: str, out_name: str) -> dict:
    data = layout[page]
    items = []
    for e in data["elements"]:
        base = {
            "i": e["order"],
            "x": round(e["cx"] - e["w"] / 2, 2),
            "y": round(e["cy"] - e["h"] / 2, 2),
            "w": round(e["w"], 2),
            "h": round(e["h"], 2),
            "r": round(e["rot"], 2),
        }
        if abs(base["r"]) < 0.05:
            base["r"] = 0
        if e["opacity"] < 1:
            base["o"] = e["opacity"]
        if e.get("flip"):
            base["flip"] = True
        if e["type"] == "image" and e["uri"] == PAPER:
            continue  # el papel de puntos se pinta como fondo en CSS
        if e["type"] in ("image", "video"):
            if e["type"] == "video":
                items.append({**base, "kind": "video", "uri": e["uri"]})
                continue
            img = crop_element(fetch(e["uri"]), e)
            items.append({**base, "kind": "img", "uri": e["uri"], "src": export(out_name, e, img)})
        elif e["type"] == "text":
            layer = e["layers"][-1]
            stroke = next((l["stroke"] for l in e["layers"] if l.get("stroke")), None)
            m = re.search(r"--H97cbQ:\s*([\d.]+)px", e.get("html") or "")
            size = float(m.group(1)) if m else layer["size"]
            sm = re.search(r"transform: scale\(([\d.]+)", e.get("html") or "")
            scale = float(sm.group(1)) if sm else 1.0
            lh = re.search(r"line-height:\s*([\d.]+)px", e.get("html") or "")
            items.append({
                **base,
                "kind": "text",
                "text": layer["text"],
                "font": layer["font"].split(",")[0],
                "size": round(size * scale, 3),
                "lineHeight": round(float(lh.group(1)) / size, 4) if lh else 1.4,
                "color": layer["color"],
                "stroke": stroke,
                "align": layer["align"],
            })
        elif e["type"] == "svg":
            items.append({**base, "kind": "svg", "svg": e["svg"]})
    return {"width": data["width"], "height": data["height"], "items": items}


if __name__ == "__main__":
    pages = {"board": build("3", "board"), "envelope": build("5", "envelope"), "opened": build("6", "opened"), "letter": build("7", "letter")}
    (WORK / "canva-built.json").write_text(json.dumps(pages, ensure_ascii=False, indent=1), encoding="utf-8")
    # Papel de puntos en alta resolución para el fondo.
    paper = fetch(PAPER)
    paper.convert("RGB").save(OUT / "paper.jpg", "JPEG", quality=88)
    print({k: len(v["items"]) for k, v in pages.items()}, paper.size)
