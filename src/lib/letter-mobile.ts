import type { CanvaItem } from "./canva-types";

/**
 * Acomodo vertical de la carta para teléfonos: los mismos elementos de la
 * página 7, reubicados en un lienzo de 900 x 1500 unidades para que se vean
 * más grandes sin perder el collage de Kenya.
 */
export const MOBILE_W = 900;
export const MOBILE_H = 1500;

const W = 1366;
const MID = W / 2;
/** Las velas se agrandan un poco y quedan al centro. */
const CANDLE_SCALE = 1.12;
const CANDLE_LEFT = 464;
const CANDLE_RIGHT = 915;

function mapX(cx: number) {
  if (cx >= CANDLE_LEFT && cx <= CANDLE_RIGHT) return MOBILE_W / 2 + (cx - MID) * CANDLE_SCALE;
  const leftEdge = MOBILE_W / 2 + (CANDLE_LEFT - MID) * CANDLE_SCALE;
  const rightEdge = MOBILE_W / 2 + (CANDLE_RIGHT - MID) * CANDLE_SCALE;
  if (cx < CANDLE_LEFT) return 30 + (cx / CANDLE_LEFT) * (leftEdge - 30);
  return rightEdge + ((cx - CANDLE_RIGHT) / (W - CANDLE_RIGHT)) * (MOBILE_W - 30 - rightEdge);
}

/** Los costados se estiran hacia abajo para dar aire al collage. */
function mapSideY(cy: number) {
  return 330 + (cy - 180) * 1.22;
}

function place(it: CanvaItem, cx: number, cy: number, scale = 1): CanvaItem {
  const w = it.w * scale;
  const h = it.h * scale;
  // En elementos rotados 90° la caja visible es la transpuesta.
  const vis = Math.abs(Math.abs(it.r) - 90) < 1 ? { w: h, h: w } : { w, h };
  const minX = vis.w / 2 + 8;
  const maxX = MOBILE_W - vis.w / 2 - 8;
  const x = Math.min(maxX, Math.max(minX, cx));
  return { ...it, x: x - w / 2, y: cy - h / 2, w, h, ...(it.kind === "text" ? { size: it.size * scale } : {}) };
}

export function toMobile(items: CanvaItem[]): CanvaItem[] {
  return items.map((it) => {
    const cx = it.x + it.w / 2;
    const cy = it.y + it.h / 2;

    if (it.kind === "text") {
      if (it.y < 400) return place(it, MOBILE_W / 2, 250);
      // "celebremos otro año de mi vida!!!" en dos renglones.
      const lines = { ...it, text: "celebremos otro año\nde mi vida!!!", w: 860, h: it.h * 2 };
      return place(lines, MOBILE_W / 2, 1238);
    }

    switch (it.role) {
      case "garland": {
        const x = cx < MID ? cx * 0.72 : MOBILE_W - (W - cx) * 0.72;
        return { ...it, x: x - it.w / 2 };
      }
      case "candles":
        return place(it, mapX(cx), cy + 55, CANDLE_SCALE);
      case "buttons":
        return place(it, MOBILE_W / 2, 1418, 1.1);
      default: {
        const nearCandles = cx >= CANDLE_LEFT - 110 && cx <= CANDLE_RIGHT + 110;
        const y = nearCandles ? cy + 55 : mapSideY(cy);
        return place(it, mapX(cx), y);
      }
    }
  });
}
