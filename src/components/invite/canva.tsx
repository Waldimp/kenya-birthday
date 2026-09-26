import type { CSSProperties, ReactNode } from "react";
import type { CanvaFont, CanvaGeom, CanvaText } from "@/lib/canva-types";

/**
 * Las escenas se dibujan en unidades de página de Canva. Cada escena define
 * `--s` (px por unidad) y `u(n)` convierte unidades a CSS.
 */
export const u = (n: number) => `calc(var(--s) * ${+n.toFixed(3)})`;

export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/** Caja absoluta de un elemento, relativa al origen (ox, oy) de la escena. */
export function boxStyle(g: CanvaGeom, ox = 0, oy = 0): CSSProperties {
  return {
    position: "absolute",
    left: u(g.x - ox),
    top: u(g.y - oy),
    width: u(g.w),
    height: u(g.h),
    rotate: g.r ? `${g.r}deg` : undefined,
    opacity: g.o,
  };
}

/** Solo posición y tamaño: la rotación/opacidad las anima motion. */
export function posStyle(g: CanvaGeom, ox = 0, oy = 0): CSSProperties {
  return {
    position: "absolute",
    left: u(g.x - ox),
    top: u(g.y - oy),
    width: u(g.w),
    height: u(g.h),
  };
}

const FONT_VAR: Record<CanvaFont, string> = {
  cruiser: "var(--font-high-cruiser)",
  apricot: "var(--font-sweet-apricot)",
  poppins: "var(--font-poppins)",
};

/**
 * Texto tal como lo pinta Canva: una capa de contorno (relleno transparente)
 * debajo y la capa de color encima, con el mismo interlineado y desplazamiento.
 */
export function CanvaTextBlock({ t, children }: { t: CanvaText; children?: ReactNode }) {
  const base: CSSProperties = {
    position: "absolute",
    inset: 0,
    margin: 0,
    fontFamily: FONT_VAR[t.font],
    fontSize: u(t.size),
    lineHeight: t.lineHeight,
    textAlign: t.align as CSSProperties["textAlign"],
    whiteSpace: "pre",
    transform: "translateY(-0.1em)",
    fontKerning: "normal",
  };
  const content = children ?? t.text;
  return (
    <>
      {t.stroke && (
        <span
          aria-hidden
          style={{
            ...base,
            color: "transparent",
            WebkitTextStroke: `${u(t.stroke.width)} ${t.stroke.color}`,
          }}
        >
          {content}
        </span>
      )}
      <span style={{ ...base, color: t.color }}>{content}</span>
    </>
  );
}

/**
 * Papel de puntos de Canva (medido del asset original): puntos alternados en
 * un mosaico de 39.06 x 38.8 unidades (carta) o 31.6 (sobre), papel #f8f1df y
 * puntos #6e5e48. `alpha` reproduce la transparencia que usó Kenya en cada página.
 */
export function dotPaper(alpha: number, tileUnits = 39.06) {
  const w = 78.12;
  const h = 77.6;
  const r = 5.92;
  const mix = (c: number) => Math.round(255 - (255 - c) * alpha);
  const bg = `rgb(${mix(248)},${mix(241)},${mix(223)})`;
  const dot = `rgb(${mix(110)},${mix(94)},${mix(72)})`;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
    `<rect width='${w}' height='${h}' fill='${bg}'/>` +
    `<g fill='${dot}'>` +
    `<circle cx='${w / 4}' cy='${h / 4}' r='${r}'/>` +
    `<circle cx='${(3 * w) / 4}' cy='${(3 * h) / 4}' r='${r}'/>` +
    `</g></svg>`;
  return {
    backgroundColor: bg,
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    /** tamaño del mosaico en unidades de página */
    tile: { w: tileUnits, h: (tileUnits * h) / w },
  };
}
