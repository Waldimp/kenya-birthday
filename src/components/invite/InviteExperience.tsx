"use client";

import Image from "next/image";
import { AnimatePresence, motion as m } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { scenes } from "@/lib/canva-scenes";
import { event } from "@/lib/event";
import { type CSSVars } from "./canva";
import { easeCinema, easeSoft, EnvelopeStage, type OpenPhase } from "./EnvelopeStage";
import { LetterSheet, type FromRect } from "./LetterSheet";

type Stage = "envelope" | "peek" | "letter" | "details" | "rsvp" | "thanks";

/** Apertura del sobre: stickers → polaroids → pausa. */
const OPEN_MS = 4300;
const JOURNEY = [
  { id: "envelope" as const, label: "sobre", mark: "✉" },
  { id: "peek" as const, label: "sorpresa", mark: "★" },
  { id: "letter" as const, label: "carta", mark: "K" },
  { id: "details" as const, label: "detalles", mark: "✧" },
  { id: "rsvp" as const, label: "rsvp", mark: "♡" },
];
const board = scenes.board;

let whooshCtx: AudioContext | null = null;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function playWhoosh() {
  if (typeof window === "undefined" || prefersReducedMotion()) return;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!whooshCtx) whooshCtx = new AC();
  void whooshCtx.resume();
  const t = whooshCtx.currentTime;
  const osc = whooshCtx.createOscillator();
  const filter = whooshCtx.createBiquadFilter();
  const gain = whooshCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.28);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1600, t);
  filter.frequency.exponentialRampToValueAtTime(380, t + 0.28);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(whooshCtx.destination);
  osc.start(t);
  osc.stop(t + 0.34);
}

function isSwipeBlocked(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [data-no-swipe]"));
}

type YTPlayer = {
  playVideo: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
};

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: new (
        id: string,
        options: { events?: { onReady?: (event: { target: YTPlayer }) => void } },
      ) => YTPlayer;
    };
  }
}

function startCepillin(player: YTPlayer | null) {
  try {
    if (typeof player?.unMute === "function") player.unMute();
    if (typeof player?.setVolume === "function") player.setVolume(80);
    if (typeof player?.playVideo === "function") player.playVideo();
    const frame = document.getElementById("cepillin-yt") as HTMLIFrameElement | null;
    const command = (func: string, args: unknown[] = []) => {
      frame?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    };
    command("unMute");
    command("setVolume", [80]);
    command("playVideo");
  } catch {
    /* La música no puede frenar la invitación. */
  }
}

/** Scroll lento y cinematográfico; se cancela si la persona toca o usa la rueda. */
let scrollRaf = 0;
function slowScrollTo(top: number, duration = 1900) {
  cancelAnimationFrame(scrollRaf);
  const start = window.scrollY;
  const delta = top - start;
  if (Math.abs(delta) < 2) return;
  const t0 = performance.now();
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const cancel = () => {
    cancelAnimationFrame(scrollRaf);
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
  };
  window.addEventListener("wheel", cancel, { passive: true, once: true });
  window.addEventListener("touchstart", cancel, { passive: true, once: true });
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, start + delta * ease(t));
    if (t < 1) scrollRaf = requestAnimationFrame(step);
    else cancel();
  };
  scrollRaf = requestAnimationFrame(step);
}

export function InviteExperience() {
  const [stage, setStage] = useState<Stage>("envelope");
  const [open, setOpen] = useState(false);
  const [departing, setDeparting] = useState(false);
  const [cardRect, setCardRect] = useState<FromRect>(null);
  const [seenDetails, setSeenDetails] = useState(false);
  const [youtubeSrc, setYoutubeSrc] = useState("");
  const rootRef = useRef<HTMLElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const letterEl = useRef<HTMLDivElement | null>(null);
  const detailsEl = useRef<HTMLDivElement | null>(null);
  const pendingScroll = useRef<"letter" | "details" | null>(null);
  const stageRef = useRef(stage);
  const openRef = useRef(open);
  const departingRef = useRef(departing);
  useLayoutEffect(() => {
    stageRef.current = stage;
    openRef.current = open;
    departingRef.current = departing;
  }, [stage, open, departing]);

  const sheetMounted = stage === "letter" || stage === "details";

  const scrollToPart = useCallback((part: "letter" | "details", slow = true) => {
    const el = part === "letter" ? letterEl.current : detailsEl.current;
    if (!el) return;
    const top = part === "letter" ? 0 : el.getBoundingClientRect().top + window.scrollY - 64;
    if (slow) slowScrollTo(top, part === "details" ? 2100 : 1700);
    else window.scrollTo(0, top);
  }, []);

  function goToStage(next: Stage) {
    const current = stageRef.current;
    if (next === current || departingRef.current) return;
    playWhoosh();
    const inSheet = (s: Stage) => s === "letter" || s === "details";
    if (next === "details") setSeenDetails(true);
    if (inSheet(current) && inSheet(next)) {
      setStage(next);
      scrollToPart(next);
      return;
    }
    setCardRect(null);
    if (next === "envelope") {
      openRef.current = false;
      setOpen(false);
    } else {
      openRef.current = true;
      setOpen(true);
    }
    if (inSheet(next)) pendingScroll.current = next;
    setStage(next);
    if (!inSheet(next)) window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openEnvelope() {
    if (openRef.current || stageRef.current !== "envelope") return;
    openRef.current = true;
    setOpen(true);
    window.setTimeout(() => setStage("peek"), OPEN_MS);
    try {
      playWhoosh();
      startCepillin(playerRef.current);
    } catch {
      /* Si el audio falla, el sobre igual se abre. */
    }
  }

  function continueToLetter() {
    if (stageRef.current !== "peek" || departingRef.current) return;
    playWhoosh();
    departingRef.current = true;
    setDeparting(true);
  }

  function goNext() {
    const current = stageRef.current;
    if (current === "envelope") openEnvelope();
    else if (current === "peek") continueToLetter();
    else if (current === "letter") goToStage("details");
    else if (current === "details") goToStage("rsvp");
  }

  function goPrev() {
    const current = stageRef.current;
    if (current === "peek") goToStage("envelope");
    else if (current === "letter") goToStage("peek");
    else if (current === "details") goToStage("letter");
    else if (current === "rsvp") goToStage("details");
    else if (current === "thanks") goToStage("rsvp");
  }

  // Al montar la hoja desde otra etapa, llevarla a la parte pedida.
  useEffect(() => {
    if (!sheetMounted || !pendingScroll.current) return;
    const part = pendingScroll.current;
    pendingScroll.current = null;
    const id = window.setTimeout(() => scrollToPart(part, part === "details"), 80);
    return () => window.clearTimeout(id);
  }, [sheetMounted, scrollToPart]);

  // Si la persona baja o sube con el dedo, la etapa sigue lo que está viendo.
  useEffect(() => {
    if (!sheetMounted) return;
    const onScroll = () => {
      const d = detailsEl.current;
      if (!d || departingRef.current) return;
      const top = d.getBoundingClientRect().top;
      const next: Stage = top < window.innerHeight * 0.55 ? "details" : "letter";
      if (next !== stageRef.current) {
        if (next === "details") setSeenDetails(true);
        setStage(next);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sheetMounted]);

  useEffect(() => {
    const root = rootRef.current;
    let startX = 0;
    let startY = 0;
    let lastNav = 0;

    function canNav() {
      const now = Date.now();
      if (now - lastNav < 900) return false;
      lastNav = now;
      return true;
    }

    function onPointerMove(e: PointerEvent) {
      if (!root || prefersReducedMotion()) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      root.style.setProperty("--px", x.toFixed(3));
      root.style.setProperty("--py", y.toFixed(3));
    }

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      if (isSwipeBlocked(e.target)) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const s = stageRef.current;
      if ((s === "envelope" || s === "peek") && dy < -70 && Math.abs(dy) > Math.abs(dx)) {
        if (canNav()) goNext();
        return;
      }
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
      if (!canNav()) return;
      if (dx < 0) goNext();
      else goPrev();
    }

    function onWheel(e: WheelEvent) {
      if (isSwipeBlocked(e.target)) return;
      if (Math.abs(e.deltaY) < 40) return;
      const s = stageRef.current;
      if (s === "envelope" || s === "peek") {
        if (e.deltaY > 0 && canNav()) goNext();
        else if (e.deltaY < 0 && s === "peek" && canNav()) goPrev();
        return;
      }
      const atTop = window.scrollY <= 12;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 12;
      if (e.deltaY > 0 && atBottom && s !== "letter") {
        if (canNav()) goNext();
      } else if (e.deltaY < 0 && atTop && s !== "details") {
        if (canNav()) goPrev();
      }
    }

    function onKey(e: KeyboardEvent) {
      if (isSwipeBlocked(e.target)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (canNav()) goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (canNav()) goPrev();
      }
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
    // Los handlers leen el estado por refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const origin = window.location.origin;
    setYoutubeSrc(
      `https://www.youtube.com/embed/${event.youtubeId}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${event.youtubeId}&origin=${encodeURIComponent(origin)}`,
    );
  }, []);

  useEffect(() => {
    if (!youtubeSrc) return;

    function attach() {
      if (playerRef.current || !window.YT || !document.getElementById("cepillin-yt")) return;
      playerRef.current = new window.YT.Player("cepillin-yt", {
        events: {
          onReady: (ready) => {
            playerRef.current = ready.target;
          },
        },
      });
    }

    window.onYouTubeIframeAPIReady = attach;
    if (window.YT?.Player) attach();
    else if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, [youtubeSrc]);

  const phase: OpenPhase = departing ? "departing" : stage === "peek" ? "revealed" : open ? "opening" : "closed";
  const envelopeVisible = stage === "envelope" || stage === "peek" || departing;
  const soft = stage === "rsvp" || stage === "thanks";

  return (
    <main ref={rootRef} className={`party relative min-h-dvh overflow-x-hidden ${soft ? "party-soft" : ""}`}>
      {youtubeSrc && (
        <iframe
          id="cepillin-yt"
          title="La Feria de Cepillín"
          className="cepillin-player"
          src={youtubeSrc}
          allow="autoplay; encrypted-media; picture-in-picture"
        />
      )}
      <AnimatePresence>
        {stage !== "envelope" && (
          <m.div
            key="rail"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.8, ease: easeSoft }}
            className="journey-rail-wrap"
          >
            <JourneyRail stage={stage} onGo={goToStage} />
          </m.div>
        )}
      </AnimatePresence>

      {sheetMounted && (
        <LetterSheet
          key="sheet"
          fromRect={cardRect}
          showDetails={seenDetails || stage === "details"}
          onOpenDetails={() => goToStage("details")}
          onBackToLetter={() => goToStage("letter")}
          onRsvp={() => goToStage("rsvp")}
          letterRef={(el) => {
            letterEl.current = el;
          }}
          detailsRef={(el) => {
            detailsEl.current = el;
          }}
        />
      )}

      <AnimatePresence>
        {envelopeVisible && (
          <EnvelopeStage
            key="envelope"
            phase={phase}
            onOpen={openEnvelope}
            onContinue={continueToLetter}
            onHandoff={(rect) => {
              setCardRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
              window.scrollTo(0, 0);
              setStage("letter");
            }}
            onDeparted={() => {
              departingRef.current = false;
              setDeparting(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {stage === "rsvp" && <RsvpStage key="rsvp" onDone={() => goToStage("thanks")} />}
        {stage === "thanks" && <ThanksStage key="thanks" onHome={() => goToStage("envelope")} />}
      </AnimatePresence>
    </main>
  );
}

function JourneyRail({ stage, onGo }: { stage: Stage; onGo: (stage: Stage) => void }) {
  const current = stage === "thanks" ? JOURNEY.length : JOURNEY.findIndex((step) => step.id === stage);
  return (
    <nav className="journey-rail" aria-label="Camino de la invitación">
      {JOURNEY.map((step, index) => {
        const done = index < current;
        const active = index === current || (stage === "thanks" && index === JOURNEY.length - 1);
        return (
          <div key={step.id} className="contents">
            {index > 0 && <span className={`journey-thread ${done || active ? "on" : ""}`} />}
            <button
              type="button"
              onClick={() => onGo(step.id)}
              className={`journey-seal ${done ? "done" : ""} ${active ? "active" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span className="journey-mark">{step.mark}</span>
              <span className="journey-label">{step.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

/** Sticker real del tablero de Canva (página 3). */
function BoardImg({ id, className, style }: { id: string; className?: string; style?: CSSVars }) {
  const b = board[id];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={b.src}
      alt=""
      className={className}
      style={{ aspectRatio: `${b.w} / ${b.h}`, ...style }}
      draggable={false}
    />
  );
}

function RsvpStage({ onDone }: { onDone: () => void }) {
  const reduced = false;
  const [name, setName] = useState("");
  const [attending, setAttending] = useState<"si" | "talvez">("si");
  const [guests, setGuests] = useState(1);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const [maybeReady, setMaybeReady] = useState(false);
  const [maybeShift, setMaybeShift] = useState({ x: 0, y: 0 });
  const [noShift, setNoShift] = useState({ x: 0, y: 0 });
  const [nudge, setNudge] = useState("");

  function jump() {
    const x = (Math.random() > 0.5 ? 1 : -1) * (52 + Math.random() * 64);
    const y = (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 36);
    return { x, y };
  }

  function tryMaybe() {
    if (!maybeReady) {
      setMaybeReady(true);
      setMaybeShift(jump());
      setNudge("mmh… ¿seguro?");
      return;
    }
    setMaybeShift({ x: 0, y: 0 });
    setAttending("talvez");
    setNudge("");
  }

  function refuseNo() {
    setNoShift(jump());
    setNudge("sí o sí tienes que ir");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, attending, guests, phone, message }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "No se pudo enviar.");
      setStatus("error");
      return;
    }
    onDone();
  }

  const field =
    "mt-1 w-full rounded-2xl border border-blush/40 bg-white px-4 py-3 text-ink outline-none focus:border-blush";

  return (
    <m.section
      className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center overflow-visible px-5 pb-16 pt-24"
      initial={{ opacity: 0, y: 60, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
      transition={{ duration: reduced ? 0.2 : 1.4, ease: easeCinema }}
    >
      <BoardImg id="10" className="pointer-events-none absolute left-[6%] top-[12%] w-10 twinkle-soft" />
      <BoardImg id="36" className="pointer-events-none absolute right-[4%] top-[13%] w-20 floaty-soft" />
      <BoardImg id="42" className="mx-auto mb-1 h-16 w-auto floaty-soft" />
      <h2 className="rsvp-title">¿Vienes?</h2>
      <p className="rsvp-note">{event.rsvp.raffleNote}</p>
      <form
        onSubmit={submit}
        data-no-swipe
        className="mt-7 space-y-4 overflow-visible rounded-[32px] bg-white/90 p-6 shadow-[0_16px_40px_rgba(90,68,80,0.1)]"
      >
        <label className="block text-sm font-semibold text-ink/70">
          Tu nombre
          <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <div className="relative min-h-[4.75rem]">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setAttending("si");
                setNudge("");
              }}
              className={`rsvp-choice ${attending === "si" ? "on" : ""}`}
            >
              Sí voy
            </button>
            <button
              type="button"
              onClick={tryMaybe}
              className={`rsvp-choice dodge-btn ${attending === "talvez" ? "on" : ""}`}
              style={{ transform: `translate(${maybeShift.x}px, ${maybeShift.y}px)` }}
            >
              Tal vez
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                refuseNo();
              }}
              onMouseEnter={refuseNo}
              className="rsvp-choice dodge-btn"
              style={{ transform: `translate(${noShift.x}px, ${noShift.y}px)` }}
            >
              No puedo
            </button>
          </div>
        </div>
        {nudge && <p className="rsvp-nudge">{nudge}</p>}
        <label className="block text-sm font-semibold text-ink/70">
          ¿Cuántas personas? (incluyéndote)
          <input
            type="number"
            min={1}
            max={10}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className={field}
          />
        </label>
        <label className="block text-sm font-semibold text-ink/70">
          WhatsApp (opcional)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
        </label>
        <label className="block text-sm font-semibold text-ink/70">
          Mensaje para Kenya
          <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={field} />
        </label>
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <button type="submit" disabled={status === "saving"} className="details-cta w-full disabled:opacity-60">
          {status === "saving" ? "Enviando…" : "Confirmar"}
        </button>
      </form>
      <div className="mt-6 flex items-end justify-center gap-5">
        <BoardImg id="3" className="h-14 w-auto floaty-soft" />
        <BoardImg id="1" className="h-16 w-auto wiggle-soft" />
        <BoardImg id="25" className="h-12 w-auto twinkle-soft" />
      </div>
    </m.section>
  );
}

function ThanksStage({ onHome }: { onHome: () => void }) {
  const reduced = false;
  return (
    <m.section
      className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-5 pt-16 text-center"
      initial={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
      transition={{ duration: reduced ? 0.2 : 1.5, ease: easeCinema }}
    >
      <div className="relative mb-6 h-40 w-32 rotate-[-6deg] overflow-hidden rounded-[18px] bg-white p-2 shadow-[0_16px_28px_rgba(90,68,80,0.16)]">
        <div className="relative h-full w-full overflow-hidden rounded-xl">
          <Image src="/photos/kenya-04.png" alt="Kenya" fill className="object-cover" sizes="130px" />
        </div>
      </div>
      <BoardImg id="15" className="h-14 w-auto wiggle-soft" />
      <h2 className="thanks-title">te veo ahí</h2>
      <p className="thanks-date">{event.dateShort}</p>
      <button type="button" onClick={onHome} className="details-back mt-8">
        regreso al inicio
      </button>
    </m.section>
  );
}
