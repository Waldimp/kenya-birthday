/** Caja de un elemento en unidades de página de Canva (1366 de ancho). */
export type CanvaGeom = {
  i: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** rotación en grados */
  r: number;
  /** opacidad (solo si es < 1) */
  o?: number;
};

export type CanvaImg = CanvaGeom & {
  kind: "img";
  src: string;
  /** radio de esquinas en unidades (recorte de Canva) */
  radius?: number;
  role: "sticker" | "ribbon" | "garland" | "candles" | "photo" | "buttons" | "swirl" | "chococat";
};

export type CanvaFont = "cruiser" | "apricot" | "poppins";

export type CanvaText = CanvaGeom & {
  kind: "text";
  text: string;
  font: CanvaFont;
  /** tamaño de letra en unidades */
  size: number;
  lineHeight: number;
  color: string;
  align: string;
  stroke?: { width: number; color: string };
};

export type CanvaItem = CanvaImg | CanvaText;

export type CanvaScenes = {
  envelope: {
    box: CanvaGeom;
    layers: { back: string; card: string; front: string };
    ribbon: CanvaImg;
    stickers: CanvaImg[];
    copy: CanvaText[];
    frames: CanvaGeom[];
    video: CanvaGeom & { objectY: number };
    photo: CanvaImg;
  };
  letter: { width: number; height: number; items: CanvaItem[] };
  details: { top: number; items: CanvaItem[] };
  board: Record<string, { src: string; w: number; h: number }>;
};
