"""Genera src/lib/canva-scenes.ts a partir de .playwright-mcp/canva-built.json."""

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
built = json.loads((ROOT / ".playwright-mcp" / "canva-built.json").read_text(encoding="utf-8"))

FONTS = {"YAFShYqOEwY_1": "cruiser", "YAEt2u1JIto_0": "apricot", "YAFdJjbTu24_1": "poppins"}

ENVELOPE = "98c6beb9"
RIBBON = "04e0635e"
GARLAND = {"663b2b6b", "0f46f5d0", "c6808d98"}
CANDLES = "438304f9"
PHOTOS = {"77a03a39", "2e8bcb90"}
BUTTONS = "bc5d2f92"
SWIRL = "c1fd7ae3"
CHOCOCAT = "bc4f601a"
VIDEO_PHOTO = "2a7fa249"
# Elementos que Kenya recortó con esquinas redondeadas (clip-path de 36 u).
ROUNDED = {"77a03a39", "81106006", "2e8bcb90", "022e5d5c"}


def r2(v):
    return round(v, 2)


def geom(it):
    g = {"i": it["i"], "x": r2(it["x"]), "y": r2(it["y"]), "w": r2(it["w"]), "h": r2(it["h"]), "r": r2(it["r"])}
    if it.get("o"):
        g["o"] = it["o"]
    return g


def text(it):
    stroke = None
    if it.get("stroke"):
        m = re.match(r"([\d.]+)px\s+(rgb\([^)]*\))", it["stroke"])
        if m:
            stroke = {"width": round(float(m.group(1)), 3), "color": m.group(2)}
    t = {
        **geom(it),
        "kind": "text",
        "text": it["text"],
        "font": FONTS[it["font"]],
        "size": round(it["size"], 3),
        "lineHeight": it["lineHeight"],
        "color": it["color"],
        "align": it["align"],
    }
    if stroke:
        t["stroke"] = stroke
    return t


def img(it, role):
    out = {**geom(it), "kind": "img", "src": it["src"], "role": role}
    if (it.get("uri") or "")[:8] in ROUNDED:
        out["radius"] = 36
    return out


def uri8(it):
    return (it.get("uri") or "")[:8]


env = built["envelope"]
envelope_box = next(geom(it) for it in env["items"] if uri8(it) == ENVELOPE)
ribbon = next(img(it, "ribbon") for it in env["items"] if uri8(it) == RIBBON)
env_stickers = [img(it, "sticker") for it in env["items"] if it["kind"] == "img" and uri8(it) not in (ENVELOPE, RIBBON)]
env_copy = [text(it) for it in env["items"] if it["kind"] == "text" and it["font"] in FONTS]

op = built["opened"]
frames = [geom(it) for it in op["items"] if it["kind"] == "svg"]
video = next(geom(it) for it in op["items"] if it["kind"] == "video")
photo = next(img(it, "photo") for it in op["items"] if uri8(it) == VIDEO_PHOTO)

let = built["letter"]
front, details = [], []
for it in let["items"]:
    cy = it["y"] + it["h"] / 2
    u = uri8(it)
    if it["kind"] == "text":
        if "detalles" in it["text"]:
            continue  # nota de diseño, no es contenido
        (front if cy < 1060 else details).append(text(it))
        continue
    if it["kind"] != "img":
        continue  # línea divisoria de diseño
    if cy >= 1060:
        role = "swirl" if u == SWIRL else "chococat" if u == CHOCOCAT else "sticker"
        details.append(img(it, role))
        continue
    role = (
        "garland" if u in GARLAND
        else "candles" if u == CANDLES
        else "photo" if u in PHOTOS
        else "buttons" if u == BUTTONS
        else "sticker"
    )
    front.append(img(it, role))

board = {str(it["i"]): {"src": it["src"], "w": r2(it["w"]), "h": r2(it["h"])} for it in built["board"]["items"] if it["kind"] == "img"}

scenes = {
    "envelope": {
        "box": envelope_box,
        "layers": {
            "back": "/canva/envelope/env-back.webp",
            "card": "/canva/envelope/env-card.webp",
            "front": "/canva/envelope/env-front.webp",
        },
        "ribbon": ribbon,
        "stickers": env_stickers,
        "copy": env_copy,
        "frames": frames,
        "video": {**video, "objectY": 21.9},
        "photo": photo,
    },
    "letter": {"width": 1366, "height": 1040, "items": front},
    "details": {"top": 1060, "items": details},
    "board": board,
}

out = ROOT / "src" / "lib" / "canva-scenes.ts"
out.write_text(
    "// Generado por scripts/gen_canva_scenes.py desde el Canva (páginas 3, 5, 6 y 7).\n"
    "// Unidades = píxeles de página de Canva (1366 de ancho). No editar a mano.\n\n"
    "import type { CanvaScenes } from \"./canva-types\";\n\n"
    f"export const scenes: CanvaScenes = {json.dumps(scenes, ensure_ascii=False, indent=2)};\n",
    encoding="utf-8",
)
print("front", len(front), "details", len(details), "env stickers", len(env_stickers), "copy", len(env_copy), "board", len(board))
