"""Separa el sobre de Canva en capas para animar la tarjeta saliendo del bolsillo.

  public/canva/envelope/env-back.webp   solapa superior + interior (sin tarjeta)
  public/canva/envelope/env-card.webp   tarjeta completa (rectángulo de papel)
  public/canva/envelope/env-front.webp  bolsillo delantero (solapas laterales e inferior)

Las tres imágenes conservan el tamaño del original (735x919) para superponerse
exactamente sobre la caja del elemento del sobre en la página 5.
"""

import pathlib

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / ".playwright-mcp" / "raw" / "98c6beb9-322f-468a-a30d-f6c92be728f3.png"
OUT = ROOT / "public" / "canva" / "envelope"
OUT.mkdir(parents=True, exist_ok=True)

im = Image.open(SRC).convert("RGBA")
a = np.array(im).astype(np.float32)
rgb, alpha = a[..., :3], a[..., 3]
H, W = alpha.shape

mx, mn = rgb.max(axis=2), rgb.min(axis=2)
sat = (mx - mn) / np.maximum(mx, 1)
card = (sat < 0.10) & (mx > 215) & (alpha > 200)
card = ndimage.binary_opening(card, iterations=2)
lab, n = ndimage.label(card)
sizes = ndimage.sum(card, lab, range(1, n + 1))
card = lab == (np.argmax(sizes) + 1)
card = ndimage.binary_closing(card, iterations=4)
card = ndimage.binary_fill_holes(card)

ys, xs = np.nonzero(card)
cx0, cx1, cy0 = xs.min(), xs.max(), ys.min()

# Borde inferior visible de la tarjeta por columna (donde empieza el bolsillo).
bottom = np.full(W, -1.0)
for x in range(cx0, cx1 + 1):
    col = np.nonzero(card[:, x])[0]
    if col.size:
        bottom[x] = col.max()
bottom[cx0:cx1 + 1] = ndimage.median_filter(bottom[cx0:cx1 + 1], size=9)


def fit(x0, x1):
    xs_ = np.arange(x0, x1)
    return np.polyfit(xs_, bottom[x0:x1], 1)


left = fit(cx0 + 6, cx0 + 150)
right = fit(cx1 - 150, cx1 - 6)
boundary = np.empty(W)
for x in range(W):
    if x < cx0 + 4:
        boundary[x] = np.polyval(left, x)
    elif x > cx1 - 4:
        boundary[x] = np.polyval(right, x)
    else:
        boundary[x] = bottom[x]

yy = np.arange(H)[:, None]
front = (yy > boundary[None, :] + 0.5) & (alpha > 0)
# Las solapas laterales empiezan donde la diagonal toca el borde del sobre.
front_img = a.copy()
front_img[..., 3] = np.where(front, alpha, 0)
fa = Image.fromarray(front_img.astype(np.uint8), "RGBA")
fa.save(OUT / "env-front.webp", "WEBP", quality=92, method=6)

# Fondo: todo lo que no es bolsillo; la zona de la tarjeta se rellena con tela.
back_mask = (~front) & (alpha > 0)
# Tela 100% opaca del bolsillo inferior para rellenar el interior.
flap = rgb[H - 260:H - 150, W // 2 - 150:W // 2 + 150]
tile = np.tile(flap, (int(np.ceil(H / flap.shape[0])) + 1, int(np.ceil(W / flap.shape[1])) + 1, 1))[:H, :W]
interior = tile * 0.86  # interior en sombra
back = a.copy()
grown = ndimage.binary_dilation(card, iterations=3)
back[..., :3] = np.where(grown[..., None], interior, rgb)
back[..., 3] = np.where(back_mask | grown, np.maximum(alpha, grown * 255), 0)
back[..., 3] = np.where(front, 0, back[..., 3])
Image.fromarray(back.astype(np.uint8), "RGBA").save(OUT / "env-back.webp", "WEBP", quality=92, method=6)

# Tarjeta completa: se extiende hacia abajo hasta dentro del bolsillo.
card_bottom = int(np.polyval(left, cx0) + 40)
card_bottom = max(card_bottom, int(boundary[cx0:cx1].max()) + 30)
paper_rows = rgb[cy0 + 8:cy0 + 64, cx0 + 4:cx1 - 4]
ph = card_bottom - cy0
reps = int(np.ceil(ph / paper_rows.shape[0])) + 1
stack = np.concatenate([paper_rows if i % 2 == 0 else paper_rows[::-1] for i in range(reps)])[:ph]
card_img = np.zeros((H, W, 4), np.float32)
card_img[cy0:card_bottom, cx0 + 4:cx1 - 4, :3] = stack
card_img[cy0:card_bottom, cx0 + 4:cx1 - 4, 3] = 255
# Usa los píxeles reales donde la tarjeta es visible (bordes suaves incluidos).
vis = card & (np.arange(H)[:, None] < cy0 + 60)
card_img[..., :3] = np.where(vis[..., None], rgb, card_img[..., :3])
card_img[:cy0, :, 3] = 0
edge = Image.fromarray(card_img[..., 3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
card_img[..., 3] = np.array(edge)
Image.fromarray(card_img.astype(np.uint8), "RGBA").save(OUT / "env-card.webp", "WEBP", quality=92, method=6)

print({"card_box_px": [int(cx0), int(cy0), int(cx1), card_bottom], "size": [W, H]})
