"use client";

import { motion as m } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { scenes } from "@/lib/canva-scenes";
import type { CanvaGeom } from "@/lib/canva-types";
import { boxStyle, CanvaTextBlock, posStyle, u, type CSSVars } from "./canva";
import { TapHand } from "./TapHand";

export type OpenPhase = "closed" | "opening" | "revealed" | "departing";

const env = scenes.envelope;
/** Centro de la composición del sobre (unidades de la página 5). */
const CX = 602;
const CY = 392;
/** Tarjeta dentro del sobre, en unidades relativas a la caja del sobre. */
const K = env.box.w / 735;
const CARD = { x: 131 * K, y: 274 * K - 70.116, w: 478 * K, h: 328 * K };

export const easeCinema = [0.16, 1, 0.3, 1] as const;
export const easeSoft = [0.22, 1, 0.36, 1] as const;
const easeInOut = [0.65, 0, 0.35, 1] as const;

/** Momento de la salida en el que la tarjeta pasa a ser la carta. */
export const HANDOFF_MS = 1500;
/** Duración total de la salida del sobre. */
export const DEPART_MS = 3400;

/** Ubica `child` dentro de `parent` (ambos rotados) en coordenadas locales. */
function nest(parent: CanvaGeom, child: CanvaGeom): CanvaGeom {
  const pr = (parent.r * Math.PI) / 180;
  const dx = child.x + child.w / 2 - (parent.x + parent.w / 2);
  const dy = child.y + child.h / 2 - (parent.y + parent.h / 2);
  const lx = dx * Math.cos(-pr) - dy * Math.sin(-pr);
  const ly = dx * Math.sin(-pr) + dy * Math.cos(-pr);
  return {
    i: child.i,
    x: parent.w / 2 + lx - child.w / 2,
    y: parent.h / 2 + ly - child.h / 2,
    w: child.w,
    h: child.h,
    r: child.r - parent.r,
  };
}

/** Dirección hacia afuera de cada sticker, desde el centro del sobre. */
function scatter(g: CanvaGeom) {
  const dx = g.x + g.w / 2 - CX;
  const dy = g.y + g.h / 2 - (CY - 60);
  const len = Math.hypot(dx, dy) || 1;
  return { x: (dx / len) * 520, y: (dy / len) * 520 - 120, r: dx > 0 ? 38 : -38 };
}

export function EnvelopeStage({
  phase,
  onOpen,
  onContinue,
  onHandoff,
  onDeparted,
}: {
  phase: OpenPhase;
  onOpen: () => void;
  onContinue: () => void;
  onHandoff: (cardRect: DOMRect) => void;
  onDeparted: () => void;
}) {
  // La coreografía en slow motion es el corazón de la invitación: se reproduce
  // aunque el teléfono tenga "reducir movimiento" (muchos Android lo activan
  // con el ahorro de batería y la invitación saltaba directo a la carta).
  const reduced = false;
  const opening = phase !== "closed";
  const revealed = phase === "revealed" || phase === "departing";
  const departing = phase === "departing";
  const cardRef = useRef<HTMLDivElement>(null);
  const [handedOff, setHandedOff] = useState(false);
  const cb = useRef({ onHandoff, onDeparted });
  useLayoutEffect(() => {
    cb.current = { onHandoff, onDeparted };
  });

  useEffect(() => {
    if (!departing) return;
    const t1 = window.setTimeout(() => {
      const rect = cardRef.current?.getBoundingClientRect();
      setHandedOff(true);
      if (rect) cb.current.onHandoff(rect);
    }, reduced ? 60 : HANDOFF_MS);
    const t2 = window.setTimeout(() => cb.current.onDeparted(), reduced ? 300 : DEPART_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [departing, reduced]);

  const d = (s: number) => (reduced ? 0 : s);
  const dur = (s: number) => (reduced ? 0.2 : s);

  const video = nest(env.frames[0], env.video);
  const photo = nest(env.frames[1], env.photo);
  const polaroids = [
    { frame: env.frames[0], media: video, kind: "video" as const, delay: 1.25, flyX: "-170%", flyR: -30 },
    { frame: env.frames[1], media: photo, kind: "photo" as const, delay: 1.7, flyX: "170%", flyR: 26 },
  ];

  const sink = departing
    ? { y: "55vh", opacity: 0, transition: { delay: d(0.55), duration: dur(2.3), ease: easeInOut } }
    : { y: 0, opacity: 1 };

  return (
    <m.section
      className="envelope-stage"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: easeSoft } }}
    >
      <div className="env-scene" aria-hidden>
        <m.div
          className="env-rig"
          initial={false}
          animate={
            reduced
              ? {}
              : phase === "closed"
                ? { y: 0, scale: 1, rotateX: 0 }
                : phase === "opening"
                  ? { y: ["0vh", "-1.5vh", "2vh"], scale: [1, 1.035, 1.02], rotateX: [0, 9, 3] }
                  : { y: "2vh", scale: 1.02, rotateX: 3 }
          }
          transition={
            phase === "opening"
              ? { duration: 3.4, times: [0, 0.35, 1], ease: easeCinema }
              : { duration: 1.4, ease: easeSoft }
          }
        >
          <m.img
            src={env.layers.back}
            alt=""
            className="env-layer"
            style={{ ...boxStyle(env.box, CX, CY), zIndex: 1 }}
            initial={false}
            animate={sink}
            draggable={false}
          />

          {/* Tarjeta: sale del bolsillo y se convierte en la carta */}
          <m.div
            className="env-card"
            style={{ ...boxStyle(env.box, CX, CY), zIndex: 2 }}
            initial={false}
            animate={
              departing
                ? {
                    y: "-40%",
                    opacity: handedOff ? 0 : 1,
                    transition: {
                      y: { delay: d(0.25), duration: dur(1.5), ease: easeInOut },
                      opacity: { duration: 0 },
                    },
                  }
                : { y: 0, opacity: 1 }
            }
          >
            <img src={env.layers.card} alt="" className="env-layer-fill" draggable={false} />
            <div
              ref={cardRef}
              className="absolute"
              style={{ left: u(CARD.x), top: u(CARD.y), width: u(CARD.w), height: u(CARD.h) }}
            />
            <m.div
              className="absolute inset-0"
              initial={false}
              animate={opening ? { opacity: 0, y: "-6%", filter: "blur(2px)" } : { opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: opening ? d(0.35) : 0, duration: dur(1.6), ease: easeSoft }}
            >
              {env.copy.map((t) => (
                <div key={t.i} style={boxStyle(t, env.box.x, env.box.y)}>
                  <CanvaTextBlock t={t} />
                </div>
              ))}
            </m.div>
          </m.div>

          {/* Polaroids (página 6): suben desde dentro del bolsillo */}
          {polaroids.map((p) => (
            <m.div
              key={p.kind}
              style={posStyle(p.frame, CX, CY)}
              initial={{ y: "95%", opacity: 0, zIndex: 3 }}
              animate={
                departing
                  ? {
                      x: p.flyX,
                      y: "-35%",
                      rotate: p.flyR,
                      opacity: 0,
                      zIndex: 7,
                      transition: { duration: dur(1.45), ease: easeInOut, delay: p.kind === "photo" ? d(0.08) : 0 },
                    }
                  : opening
                    ? {
                        y: ["95%", "-22%", "0%"],
                        opacity: [0, 1, 1],
                        zIndex: [3, 3, 7],
                        transition: {
                          delay: d(p.delay),
                          duration: dur(2.5),
                          times: [0, 0.55, 1],
                          ease: easeCinema,
                          zIndex: { delay: d(p.delay), duration: dur(2.5), times: [0, 0.5, 0.52] },
                        },
                      }
                    : { y: "95%", opacity: 0, zIndex: 3, transition: { duration: 0.4 } }
              }
            >
              <div className="env-polaroid" style={{ rotate: `${p.frame.r}deg` }}>
                <div className="env-polaroid-media" style={boxStyle(p.media)}>
                  {p.kind === "video" ? (
                    opening ? <KenyaFaceVideo objectY={env.video.objectY} /> : null
                  ) : (
                    <img src={env.photo.src} alt="Kenya de niña" draggable={false} />
                  )}
                </div>
              </div>
            </m.div>
          ))}

          <m.img
            src={env.layers.front}
            alt=""
            className="env-layer"
            style={{ ...boxStyle(env.box, CX, CY), zIndex: 4 }}
            initial={false}
            animate={sink}
            draggable={false}
          />

          <m.img
            src={env.ribbon.src}
            alt=""
            className="env-layer env-ribbon"
            style={{ ...boxStyle(env.ribbon, CX, CY), zIndex: 5 }}
            initial={false}
            animate={
              departing
                ? sink
                : opening
                  ? { scale: [1, 1.04, 1], rotate: [0, -1.5, 0], y: 0, opacity: env.ribbon.o ?? 1 }
                  : { scale: 1, rotate: 0, y: 0, opacity: env.ribbon.o ?? 1 }
            }
            transition={{ duration: dur(1.8), ease: easeSoft }}
            draggable={false}
          />

          {env.stickers.map((s, idx) => {
            const out = scatter(s);
            return (
              <m.div
                key={s.i}
                className="env-sticker"
                style={{
                  ...posStyle(s, CX, CY),
                  // En teléfono los stickers de las orillas se acercan al sobre.
                  left: `calc(var(--s) * ((${(s.x + s.w / 2 - CX).toFixed(2)}) * var(--pull, 1) - ${(s.w / 2).toFixed(2)}))`,
                  zIndex: 6,
                }}
                initial={false}
                animate={
                  opening
                    ? { x: out.x + "%", y: out.y + "%", rotate: s.r + out.r, scale: 0.6, opacity: 0 }
                    : { x: "0%", y: "0%", rotate: s.r, scale: 1, opacity: 1 }
                }
                transition={{
                  delay: opening ? d(0.05 + idx * 0.07) : 0.2 + idx * 0.04,
                  duration: opening ? dur(2.6) : 0.9,
                  ease: easeCinema,
                }}
              >
                <span className="parallax-layer block h-full w-full" style={{ "--depth": `${10 + (idx % 4) * 5}px` } as CSSVars}>
                  <img src={s.src} alt="" className={`h-full w-full ${idx % 3 === 0 ? "floaty-soft" : idx % 3 === 1 ? "twinkle-soft" : "wiggle-soft"}`} draggable={false} />
                </span>
              </m.div>
            );
          })}
        </m.div>
      </div>

      <m.div
        className="envelope-bloom"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "opening" ? 0.6 : 0 }}
        transition={{ duration: 1.6 }}
        aria-hidden
      />

      <button
        type="button"
        onClick={revealed ? onContinue : onOpen}
        className="envelope-hit"
        aria-label={revealed ? "Ver la carta" : "Abrir el sobre"}
        disabled={phase === "opening" || departing}
      />

      <TapHand
        show={phase === "closed" || phase === "revealed"}
        delay={phase === "revealed" ? 1.2 : 1.6}
        className={phase === "revealed" ? "tap-envelope-open" : "tap-envelope"}
      />

      <m.p
        className="envelope-cta"
        initial={false}
        animate={phase === "closed" || phase === "revealed" ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.9, delay: phase === "revealed" ? 0.5 : 0 }}
      >
        <span className="pulse-soft inline-block">
          {revealed ? "toca o desliza para abrir la carta" : "toca para abrir el sobre"}
        </span>
      </m.p>
    </m.section>
  );
}

function KenyaFaceVideo({ objectY }: { objectY: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    void el.play().catch(() => {});
  }, []);
  return (
    <video
      ref={ref}
      src="/videos/kenya-face.mp4"
      poster="/videos/kenya-face-poster.jpg"
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      style={{ objectPosition: `50% ${objectY}%` }}
    />
  );
}
