"use client";

import { animate, motion as m } from "motion/react";
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { scenes } from "@/lib/canva-scenes";
import type { CanvaImg, CanvaItem } from "@/lib/canva-types";
import { event } from "@/lib/event";
import { MOBILE_H, MOBILE_W, toMobile } from "@/lib/letter-mobile";
import { boxStyle, CanvaTextBlock, dotPaper, posStyle, u, type CSSVars } from "./canva";
import { easeCinema, easeSoft } from "./EnvelopeStage";
import { TapHand } from "./TapHand";

const letter = scenes.letter;
const details = scenes.details;
const board = scenes.board;
const letterPaper = dotPaper(0.58, 39.06);
/** Detalles: el mismo papel pero más pálido para que el texto se lea bien. */
const detailsPaper = dotPaper(0.24, 39.06);
const mobileItems = toMobile(letter.items);

/** Teléfono en vertical: la carta usa el acomodo alto (lib/letter-mobile). */
const PHONE_QUERY = "(max-width: 760px) and (orientation: portrait)";
function subscribePhone(cb: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function usePhoneLayout() {
  return useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

/** Retraso de "pintado" de cada elemento según su rol y su distancia al centro. */
function paintDelay(it: CanvaItem) {
  const cx = it.x + it.w / 2;
  const cy = it.y + it.h / 2;
  const dist = Math.hypot(cx - 683, cy - 480) / 683;
  if (it.kind === "text") return it.y < 400 ? 0.55 : 1.75;
  switch (it.role) {
    case "garland":
      return 0.1 + (cx < 683 ? cx : 1366 - cx) / 2400;
    case "candles":
      return 0.9 + (cx > 683 ? 0.18 : 0);
    case "photo":
      return 1.15 + (cx > 683 ? 0.2 : 0);
    case "buttons":
      return 2.1;
    default:
      return 1.0 + dist * 1.1;
  }
}

function paintVariants(it: CanvaItem) {
  const r = it.r;
  if (it.kind === "text") {
    return {
      hidden: { clipPath: "inset(-20% 100% -20% 0%)", opacity: 1 },
      shown: { clipPath: "inset(-20% 0% -20% 0%)", opacity: 1 },
    };
  }
  switch (it.role) {
    case "garland":
      return {
        hidden: { y: "-70%", opacity: 0, rotate: r, scale: 1 },
        shown: { y: "0%", opacity: it.o ?? 1, rotate: r, scale: 1 },
      };
    case "candles":
      return {
        hidden: { y: "18%", opacity: 0, scale: 0.72, rotate: r },
        shown: { y: "0%", opacity: 1, scale: 1, rotate: r },
      };
    case "photo":
      return {
        hidden: { y: "10%", opacity: 0, scale: 0.8, rotate: r + (it.x > 683 ? 14 : -14) },
        shown: { y: "0%", opacity: 1, scale: 1, rotate: r },
      };
    case "buttons":
      return {
        hidden: { opacity: 0, scaleY: 0.2, rotate: r },
        shown: { opacity: 1, scaleY: 1, rotate: r },
      };
    default:
      return {
        hidden: { opacity: 0, scale: 0.2, rotate: r - 28 },
        shown: { opacity: it.o ?? 1, scale: 1, rotate: r },
      };
  }
}

function paintTransition(it: CanvaItem, speed: number) {
  const delay = paintDelay(it) * speed;
  if (it.kind === "text") return { delay, duration: 1.5 * speed, ease: easeSoft };
  if (it.kind === "img" && (it.role === "sticker" || it.role === "candles")) {
    return { delay, type: "spring" as const, stiffness: 120, damping: 11, mass: 0.9 };
  }
  return { delay, duration: 1.3 * speed, ease: easeCinema };
}

function ItemBody({ it }: { it: CanvaItem }) {
  if (it.kind === "text") return <CanvaTextBlock t={it} />;
  const idle =
    it.role === "sticker" ? (it.i % 3 === 0 ? "floaty-soft" : it.i % 3 === 1 ? "twinkle-soft" : "wiggle-soft") : it.role === "garland" ? "sway-soft" : "";
  return (
    <img
      src={it.src}
      alt={it.role === "photo" ? "Kenya" : ""}
      className={`h-full w-full ${idle}`}
      style={it.radius ? { borderRadius: u(it.radius) } : undefined}
      draggable={false}
    />
  );
}

function PaintedItem({ it, paint, speed, ox = 0, oy = 0 }: { it: CanvaItem; paint: boolean; speed: number; ox?: number; oy?: number }) {
  const depth = it.kind === "img" && it.role === "sticker" ? 8 + (it.i % 5) * 4 : it.kind === "img" && it.role === "garland" ? 4 : 2;
  return (
    <m.div
      style={posStyle(it, ox, oy)}
      variants={paintVariants(it)}
      initial="hidden"
      animate={paint ? "shown" : "hidden"}
      transition={paintTransition(it, speed)}
    >
      <span className="parallax-layer absolute inset-0 block" style={{ "--depth": `${depth}px` } as CSSVars}>
        <ItemBody it={it} />
      </span>
    </m.div>
  );
}

function BoardSticker({ id, x, y, w, r = 0, cls = "floaty-soft", paint, delay }: { id: string; x: number; y: number; w: number; r?: number; cls?: string; paint: boolean; delay: number }) {
  const b = board[id];
  const h = (w * b.h) / b.w;
  return (
    <m.div
      className="pointer-events-none absolute"
      style={{ left: `${(x / 1366) * 100}%`, top: u(y), width: u(w), height: u(h) }}
      initial={{ opacity: 0, scale: 0.3, rotate: r - 24 }}
      animate={paint ? { opacity: 1, scale: 1, rotate: r } : { opacity: 0, scale: 0.3, rotate: r - 24 }}
      transition={{ delay, type: "spring", stiffness: 110, damping: 12 }}
    >
      <span className="parallax-layer absolute inset-0 block" style={{ "--depth": "12px" } as CSSVars}>
        <img src={b.src} alt="" className={`h-full w-full ${cls}`} draggable={false} />
      </span>
    </m.div>
  );
}

export type FromRect = { left: number; top: number; width: number; height: number } | null;

export function LetterSheet({
  fromRect,
  showDetails,
  onOpenDetails,
  onBackToLetter,
  onRsvp,
  letterRef,
  detailsRef,
}: {
  fromRect: FromRect;
  showDetails: boolean;
  onOpenDetails: () => void;
  onBackToLetter: () => void;
  onRsvp: () => void;
  letterRef: (el: HTMLDivElement | null) => void;
  detailsRef: (el: HTMLDivElement | null) => void;
}) {
  // La coreografía en slow motion es el corazón de la invitación: se reproduce
  // aunque el teléfono tenga "reducir movimiento" (muchos Android lo activan
  // con el ahorro de batería y la invitación saltaba directo a la carta).
  const reduced = false;
  const phone = usePhoneLayout();
  const items = phone ? mobileItems : letter.items;
  const sheetW = phone ? MOBILE_W : letter.width;
  const sheetH = phone ? MOBILE_H : letter.height;
  const sheetRef = useRef<HTMLDivElement>(null);
  const [paint, setPaint] = useState(false);
  const [blank, setBlank] = useState(Boolean(fromRect));
  const speed = reduced ? 0.01 : 1;

  // La tarjeta del sobre crece hasta ser la carta (FLIP desde el rect de la tarjeta).
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    if (!fromRect || reduced) {
      const id = window.setTimeout(() => {
        setBlank(false);
        setPaint(true);
      }, reduced ? 0 : 120);
      return () => window.clearTimeout(id);
    }
    // Medir sin transformación (en desarrollo el efecto corre dos veces).
    el.style.transform = "none";
    const r = el.getBoundingClientRect();
    const sx = fromRect.width / r.width;
    const sy = fromRect.height / r.height;
    const dx = fromRect.left - r.left;
    const dy = fromRect.top - r.top;
    el.style.transformOrigin = "0 0";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    const controls = animate(
      el,
      { x: [dx, 0], y: [dy, 0], scaleX: [sx, 1], scaleY: [sy, 1] },
      { duration: 2.3, ease: easeCinema },
    );
    const t1 = window.setTimeout(() => setBlank(false), 700);
    const t2 = window.setTimeout(() => setPaint(true), 1100);
    return () => {
      controls.stop();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // Solo al montar: el rect de la tarjeta es el de ese instante.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swirl = details.items.find((it) => it.kind === "img" && it.role === "swirl") as CanvaImg | undefined;
  const chococat = details.items.find((it) => it.kind === "img" && it.role === "chococat") as CanvaImg | undefined;

  return (
    <div className={`letter-column ${phone ? "is-phone" : ""}`}>
      <div ref={letterRef} className="letter-slot">
        <div
          ref={sheetRef}
          className="letter-sheet"
          style={{
            backgroundColor: letterPaper.backgroundColor,
            backgroundImage: letterPaper.backgroundImage,
            width: u(sheetW),
            height: u(sheetH),
          }}
        >
          <div className="letter-scene">
            {items.map((it) => (
              <PaintedItem key={it.i} it={it} paint={paint} speed={speed} />
            ))}
          </div>
          <m.div
            className="letter-blank"
            initial={false}
            animate={{ opacity: blank ? 1 : 0 }}
            transition={{ duration: reduced ? 0.01 : 1.1, ease: easeSoft }}
            aria-hidden
          />
          <button
            type="button"
            className="letter-hit"
            aria-label="Ver los detalles de la fiesta"
            onClick={onOpenDetails}
          />
          <TapHand show={paint && !showDetails} delay={2.8 * speed} className="tap-letter" />
          <h1 className="sr-only">
            {event.letterHeadline} — {event.letterSubline}
          </h1>
        </div>
        <m.p
          className="letter-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: paint && !showDetails ? 1 : 0, y: paint ? 0 : 8 }}
          transition={{ delay: paint ? 2.6 * speed : 0, duration: 0.9 }}
        >
          <span className="pulse-soft inline-block">toca la carta o desliza hacia abajo ↓</span>
        </m.p>
      </div>

      <m.section
        ref={detailsRef}
        className="details-sheet"
        style={{ backgroundColor: detailsPaper.backgroundColor, backgroundImage: detailsPaper.backgroundImage }}
        aria-label="Detalles de la fiesta"
        initial={{ opacity: 0 }}
        animate={{ opacity: paint ? 1 : 0 }}
        transition={{ delay: paint ? 1.2 * speed : 0, duration: 1.2 }}
      >
        <div className="details-scene" aria-hidden>
          {swirl && <PaintedItem it={swirl} paint={showDetails} speed={speed * 0.6} oy={details.top} />}
          {chococat && <PaintedItem it={chococat} paint={showDetails} speed={speed * 0.6} oy={details.top} />}
          <BoardSticker id="17" x={1180} y={70} w={150} r={-12} cls="sway-soft" paint={showDetails} delay={0.5} />
          <BoardSticker id="42" x={1135} y={250} w={120} r={6} paint={showDetails} delay={0.75} />
          <BoardSticker id="34" x={1262} y={40} w={72} r={10} cls="twinkle-soft" paint={showDetails} delay={0.95} />
          <BoardSticker id="30" x={40} y={560} w={130} r={-6} cls="wiggle-soft" paint={showDetails} delay={1.1} />
          <BoardSticker id="38" x={1190} y={610} w={110} r={12} cls="twinkle-soft" paint={showDetails} delay={1.25} />
          <BoardSticker id="10" x={215} y={120} w={56} r={-10} cls="twinkle-soft" paint={showDetails} delay={0.85} />
        </div>

        <DetailsContent show={showDetails} speed={speed} onRsvp={onRsvp} onBack={onBackToLetter} />
      </m.section>
    </div>
  );
}

function Reveal({ show, delay, children, className }: { show: boolean; delay: number; children: ReactNode; className?: string }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 26, filter: "blur(6px)" }}
      animate={show ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 26, filter: "blur(6px)" }}
      transition={{ delay: show ? delay : 0, duration: 1.1, ease: easeCinema }}
    >
      {children}
    </m.div>
  );
}

function PaletteStar({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 96" className="palette-star" aria-hidden>
      <path
        d="M50 4c3 0 5 2 6.4 5l9.8 20.2 22.1 3.2c6.6 1 9.2 9 4.4 13.6L76.7 61.7l3.8 22c1.1 6.5-5.7 11.5-11.6 8.4L50 81.7 31.1 92.1c-5.9 3.1-12.7-1.9-11.6-8.4l3.8-22L7.3 46c-4.8-4.6-2.2-12.6 4.4-13.6l22.1-3.2L43.6 9C45 6 47 4 50 4z"
        fill={color}
        stroke="rgba(255,255,255,.9)"
        strokeWidth="4"
      />
    </svg>
  );
}

function DetailsContent({ show, speed, onRsvp, onBack }: { show: boolean; speed: number; onRsvp: () => void; onBack: () => void }) {
  const s = speed;
  return (
    <div className="details-content">
      <m.p
        className="details-title"
        initial={{ clipPath: "inset(-30% 100% -30% 0%)" }}
        animate={{ clipPath: show ? "inset(-30% 0% -30% 0%)" : "inset(-30% 100% -30% 0%)" }}
        transition={{ delay: show ? 0.35 : 0, duration: 1.4 * s, ease: easeSoft }}
      >
        ¿¿¿En dónde???
      </m.p>
      <Reveal show={show} delay={0.8 * s} className="details-block">
        <p className="details-big">{event.venue}</p>
        <p className="details-script">{event.address}</p>
        <a
          href={event.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="details-pill"
          onClick={(e) => e.stopPropagation()}
        >
          Abrir en Maps
        </a>
      </Reveal>

      <Reveal show={show} delay={1.05 * s} className="details-block">
        <p className="details-heading">¿¿¿Cuándo???</p>
        <p className="details-big">
          {event.weekday} {event.dateLabel.replace(" del 2026", "")}
        </p>
        <p className="details-script">{event.time}</p>
      </Reveal>

      <Reveal show={show} delay={1.3 * s} className="details-block">
        <p className="details-heading">Dress code</p>
        <p className="details-script">{event.dress.body}</p>
        <p className="details-note">{event.dress.note}</p>
        <div className="palette-row">
          {event.dress.swatches.map((c) => (
            <PaletteStar key={c} color={c} />
          ))}
        </div>
      </Reveal>

      <Reveal show={show} delay={1.55 * s} className="details-actions">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRsvp();
          }}
          className="details-cta"
        >
          Confirmar asistencia
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          className="details-back"
        >
          ↑ volver a la carta
        </button>
      </Reveal>
    </div>
  );
}
