"use client";

import Image from "next/image";
import { AnimatePresence, motion as m, useReducedMotion } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { event } from "@/lib/event";

type Stage = "envelope" | "peek" | "letter" | "details" | "rsvp" | "thanks";
type OpenPhase = "closed" | "opening" | "revealed";

/** Apertura cinematográfica lenta: stickers → lift → polaroids → hold */
const OPEN_MS = 4200;
const easeCinema = [0.16, 1, 0.3, 1] as const;
const easeSoft = [0.22, 1, 0.36, 1] as const;
const JOURNEY = [
  { id: "envelope" as const, label: "sobre", mark: "✉" },
  { id: "peek" as const, label: "sorpresa", mark: "★" },
  { id: "letter" as const, label: "carta", mark: "K" },
  { id: "details" as const, label: "detalles", mark: "✧" },
  { id: "rsvp" as const, label: "rsvp", mark: "♡" },
];

type CSSVars = CSSProperties & Record<`--${string}`, string>;

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
  player?.unMute();
  player?.setVolume(80);
  player?.playVideo();
  const frame = document.getElementById("cepillin-yt") as HTMLIFrameElement | null;
  const command = (func: string, args: unknown[] = []) => {
    frame?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  };
  command("unMute");
  command("setVolume", [80]);
  command("playVideo");
}

export function InviteExperience() {
  const [stage, setStage] = useState<Stage>("envelope");
  const [open, setOpen] = useState(false);
  const [youtubeSrc, setYoutubeSrc] = useState("");
  const rootRef = useRef<HTMLElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const stageRef = useRef(stage);
  const openRef = useRef(open);
  stageRef.current = stage;
  openRef.current = open;

  function goToStage(next: Stage) {
    if (next === stageRef.current) return;
    if (next === "envelope") {
      openRef.current = false;
      setOpen(false);
    } else {
      openRef.current = true;
      setOpen(true);
    }
    playWhoosh();
    setStage(next);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function openEnvelope() {
    if (openRef.current || stageRef.current !== "envelope") return;
    openRef.current = true;
    setOpen(true);
    playWhoosh();
    startCepillin(playerRef.current);
    const delay = prefersReducedMotion() ? 0 : OPEN_MS;
    window.setTimeout(() => setStage("peek"), delay);
  }

  function goNext() {
    const current = stageRef.current;
    if (current === "envelope") {
      openEnvelope();
      return;
    }
    if (current === "peek") goToStage("letter");
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

  useEffect(() => {
    const root = rootRef.current;
    let startX = 0;
    let startY = 0;
    let lastNav = 0;

    function canNav() {
      const now = Date.now();
      if (now - lastNav < 780) return false;
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
      if (stageRef.current === "envelope" && dy < -70 && Math.abs(dy) > Math.abs(dx)) {
        if (canNav()) openEnvelope();
        return;
      }
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
      if (!canNav()) return;
      if (dx < 0) goNext();
      else goPrev();
    }

    function onWheel(e: WheelEvent) {
      if (isSwipeBlocked(e.target)) return;
      if (Math.abs(e.deltaY) < 48) return;
      const atTop = window.scrollY <= 12;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 12;
      if (e.deltaY > 0 && atBottom) {
        if (canNav()) goNext();
      } else if (e.deltaY < 0 && atTop) {
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

  const openPhase: OpenPhase =
    stage === "peek" ? "revealed" : open ? "opening" : "closed";
  const softBg = stage !== "envelope" || open;

  return (
    <main
      ref={rootRef}
      className={`party relative min-h-dvh overflow-x-hidden ${softBg ? "party-soft" : ""}`}
    >
      {youtubeSrc && (
        <iframe
          id="cepillin-yt"
          title="La Feria de Cepillín"
          className="cepillin-player"
          src={youtubeSrc}
          allow="autoplay; encrypted-media; picture-in-picture"
        />
      )}
      {stage !== "envelope" && <JourneyRail stage={stage} onGo={goToStage} />}
      <AnimatePresence mode="wait">
        {(stage === "envelope" || stage === "peek") && (
          <EnvelopeStage
            key="unbox"
            phase={openPhase}
            onOpen={openEnvelope}
            onContinue={() => goToStage("letter")}
          />
        )}
        {stage === "letter" && (
          <LetterStage key="letter" onNext={() => goToStage("details")} />
        )}
        {stage === "details" && (
          <DetailsStage key="details" onNext={() => goToStage("rsvp")} />
        )}
        {stage === "rsvp" && (
          <RsvpStage key="rsvp" onDone={() => goToStage("thanks")} />
        )}
        {stage === "thanks" && (
          <ThanksStage key="thanks" onHome={() => goToStage("envelope")} />
        )}
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

function EnvelopeStage({
  phase,
  onOpen,
  onContinue,
}: {
  phase: OpenPhase;
  onOpen: () => void;
  onContinue: () => void;
}) {
  const revealed = phase === "revealed";
  const opening = phase === "opening" || revealed;
  const reduced = useReducedMotion() ?? false;

  // Stickers Canva pág.5 — sin conchita (no está en el mockup / no es PNG limpio)
  const stickers = [
    { src: "/stickers/kitten-party.png", className: "left-[-12%] top-[2%] w-[28%]", delay: 0, sx: -70, sy: -100, sr: -14, depth: 20, motion: "floaty" as const },
    { src: "/stickers/heart.png", className: "left-[14%] top-[17%] w-[8%]", delay: 0.16, sx: -20, sy: -70, sr: 10, depth: 22, motion: "twinkle" as const },
    { src: "/stickers/party-hat.png", className: "left-[52%] top-[16%] w-[30%]", delay: 0.2, sx: 10, sy: -80, sr: -8, depth: 16, motion: "wiggle" as const },
    { src: "/stickers/star-yellow.png", className: "right-[8%] top-[14%] w-[10%]", delay: 0.14, sx: 50, sy: -60, sr: 12, depth: 16, motion: "twinkle" as const },
    { src: "/stickers/angelic-star.png", className: "right-[-2%] top-[3%] w-[16%]", delay: 0.08, sx: 70, sy: -90, sr: 18, depth: 20, motion: "twinkle" as const },
    { src: "/stickers/rosette.png", className: "right-[-14%] top-[30%] w-[36%]", delay: 0.12, sx: 110, sy: 8, sr: 10, depth: 18, motion: "floaty" as const },
    { src: "/stickers/pusheen-donut.png", className: "right-[-10%] bottom-[16%] w-[24%]", delay: 0.28, sx: 90, sy: 70, sr: 14, depth: 10, motion: "floaty" as const },
    { src: "/stickers/monkey.png", className: "left-[-14%] bottom-[20%] w-[32%]", delay: 0.18, sx: -100, sy: 70, sr: -10, depth: 8, motion: "floaty" as const },
    { src: "/stickers/pearl-star.png", className: "left-[12%] bottom-[32%] w-[9%]", delay: 0.22, sx: -60, sy: 40, sr: -18, depth: 24, motion: "twinkle" as const },
  ];

  return (
    <m.section
      className="envelope-stage"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 0.78,
        y: 80,
        rotateX: -28,
        filter: "blur(10px)",
        transition: { duration: 1.15, ease: easeCinema },
      }}
    >
      <button
        type="button"
        onClick={revealed ? onContinue : onOpen}
        className={`envelope-hero ${opening ? "open" : ""}`}
        aria-label={revealed ? "Ver la carta" : "Abrir el sobre"}
        disabled={phase === "opening"}
      >
        <div className="envelope-frame">
          <m.div
            className="envelope-motion"
            initial={false}
            animate={
              reduced
                ? { y: 0, scale: 1, rotateX: 0 }
                : phase === "closed"
                  ? { y: 0, scale: 1, rotateX: 0, filter: "brightness(1)" }
                  : phase === "opening"
                    ? {
                        y: [0, -28, -52],
                        scale: [1, 1.045, 1.09],
                        rotateX: [0, 11, 17],
                        filter: ["brightness(1)", "brightness(1.08)", "brightness(1.15)"],
                      }
                    : {
                        y: -18,
                        scale: 1.03,
                        rotateX: 7,
                        filter: "brightness(1.06)",
                      }
            }
            transition={
              phase === "opening"
                ? { duration: 3.2, times: [0, 0.42, 1], ease: easeCinema }
                : { duration: 1.15, ease: easeSoft }
            }
            style={{ transformOrigin: "50% 72%", transformStyle: "preserve-3d" }}
          >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/envelope.png?v=2"
            alt="Sobre de ojalillo"
            width={531}
            height={641}
            className="envelope-photo"
            draggable={false}
          />

          {/* Polaroids: salen del bolsillo del sobre */}
          <div className="envelope-polaroids" aria-hidden={phase === "closed"}>
            <m.div
              className="envelope-polaroid"
              style={{ "--peek-tilt": "-6deg" } as CSSVars}
              initial={{ opacity: 0, y: "42%", scale: 0.72, rotate: -10 }}
              animate={
                opening
                  ? {
                      opacity: 1,
                      y: "0%",
                      scale: 1,
                      rotate: -6,
                    }
                  : { opacity: 0, y: "42%", scale: 0.72, rotate: -10 }
              }
              transition={{
                delay: opening ? (reduced ? 0 : 1.15) : 0,
                duration: reduced ? 0.2 : 1.55,
                ease: easeCinema,
              }}
            >
              <div className="peek-polaroid-media">
                {opening ? <KenyaFaceVideo /> : null}
              </div>
            </m.div>
            <m.div
              className="envelope-polaroid"
              style={{ "--peek-tilt": "5deg" } as CSSVars}
              initial={{ opacity: 0, y: "48%", scale: 0.72, rotate: 12 }}
              animate={
                opening
                  ? {
                      opacity: 1,
                      y: "0%",
                      scale: 1,
                      rotate: 5,
                    }
                  : { opacity: 0, y: "48%", scale: 0.72, rotate: 12 }
              }
              transition={{
                delay: opening ? (reduced ? 0.05 : 1.55) : 0,
                duration: reduced ? 0.2 : 1.65,
                ease: easeCinema,
              }}
            >
              <div className="peek-polaroid-media">
                <Image
                  src={event.peekPolaroidRight.src}
                  alt={event.peekPolaroidRight.alt}
                  fill
                  className="object-cover"
                  sizes="40vw"
                />
              </div>
            </m.div>
          </div>

          <m.div
            className="envelope-copy"
            initial={false}
            animate={
              opening
                ? { opacity: 0, y: "-38%", scale: 1.06 }
                : { opacity: 1, y: "0%", scale: 1 }
            }
            transition={{ duration: reduced ? 0.15 : 1.4, ease: easeSoft, delay: opening ? 0.15 : 0 }}
          >
            <p className="envelope-headline">
              {event.envelopeHeadline}
            </p>
            <p className="envelope-subline">
              {event.envelopeSubline}
            </p>
            <p className="envelope-date">
              {event.dateShort}
            </p>
          </m.div>

          <m.div
            className="envelope-ribbon"
            data-envelope-seal="ribbon"
            initial={false}
            animate={
              opening
                ? { opacity: 0, y: 56, rotate: -12, scale: 0.92 }
                : { opacity: 1, y: 0, rotate: 0, scale: 1 }
            }
            transition={{
              delay: opening ? (reduced ? 0 : 0.05) : 0,
              duration: opening ? 1.35 : 0.6,
              ease: easeCinema,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/stickers/ribbon-bow.png"
              alt=""
              onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement | null)?.style.setProperty("display", "none");
              }}
            />
          </m.div>

          {stickers.map((s) => (
            <m.span
              key={s.src + s.className}
              className={`sticker parallax-layer ${s.className}`}
              style={{ "--depth": `${s.depth}px` } as CSSVars}
              initial={false}
              animate={
                opening
                  ? {
                      x: s.sx,
                      y: s.sy,
                      rotate: s.sr,
                      scale: 0.55,
                      opacity: 0,
                    }
                  : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }
              }
              transition={{
                delay: opening ? s.delay : 0,
                duration: opening ? 2.4 : 0.6,
                ease: easeCinema,
              }}
            >
              <span className="sticker-inner pop">
                <img
                  src={s.src}
                  alt=""
                  className={`block h-auto w-full ${opening ? "" : s.motion}`}
                />
              </span>
            </m.span>
          ))}
          </m.div>
        </div>
      </button>

      <m.div
        className="envelope-bloom"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "opening" ? 0.55 : 0 }}
        transition={{ duration: 1.2 }}
        aria-hidden
      />

      <m.p
        className="envelope-cta px-5 font-[family-name:var(--font-script)] text-2xl text-ink/80 sm:text-3xl"
        initial={false}
        animate={
          phase === "closed"
            ? { opacity: 1, y: 0 }
            : phase === "opening"
              ? { opacity: 0, y: 12 }
              : { opacity: 1, y: 0 }
        }
        transition={{ duration: 0.8, delay: revealed ? 0.4 : 0 }}
      >
        {revealed ? "toca o desliza para abrir la carta" : "haz clic para abrir el sobre"}
      </m.p>
    </m.section>
  );
}

function KenyaFaceVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [usePoster, setUsePoster] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || usePoster) return;
    el.muted = true;
    el.playsInline = true;
    const play = () => {
      void el.play().catch(() => setUsePoster(true));
    };
    play();
    el.addEventListener("loadeddata", play);
    el.addEventListener("error", () => setUsePoster(true));
    return () => {
      el.removeEventListener("loadeddata", play);
    };
  }, [usePoster]);

  if (usePoster) {
    return (
      <img src={event.faceVideoPoster} alt="Kenya" className="h-full w-full object-cover" />
    );
  }

  return (
    <video
      ref={ref}
      src={event.faceVideoSrc}
      poster={event.faceVideoPoster}
      muted
      loop
      playsInline
      autoPlay
      className="h-full w-full object-cover"
    />
  );
}

function LetterStage({ onNext }: { onNext: () => void }) {
  const reduced = useReducedMotion() ?? false;

  const stickers: {
    src: string;
    className: string;
    delay: number;
    rotate?: number;
    motion?: "floaty" | "wiggle" | "spin-slow" | "twinkle";
  }[] = [
    { src: "/stickers/heart.png", className: "left-[6%] top-[6%] w-10 sm:w-12", delay: 0.55, motion: "twinkle" },
    { src: "/stickers/heart.png", className: "right-[8%] top-[7%] w-9 sm:w-11", delay: 0.62, motion: "twinkle", rotate: 18 },
    { src: "/stickers/star-gingham.png", className: "left-[18%] top-[10%] w-11", delay: 0.7, motion: "floaty" },
    { src: "/stickers/disco.png", className: "right-[16%] top-[12%] w-12 sm:w-14", delay: 0.78, motion: "spin-slow" },
    { src: "/stickers/little-twin.png", className: "left-[4%] top-[22%] w-14 sm:w-16", delay: 0.88, motion: "wiggle" },
    { src: "/stickers/deer.png", className: "right-[3%] top-[20%] w-14 sm:w-18", delay: 0.95, motion: "floaty" },
    { src: "/stickers/pearl-star.png", className: "left-[12%] top-[34%] w-10", delay: 1.02, motion: "twinkle" },
    { src: "/stickers/angelic-star.png", className: "right-[10%] top-[32%] w-12", delay: 1.08, motion: "floaty" },
    { src: "/stickers/bow.png", className: "left-[8%] top-[48%] w-11", delay: 1.15, motion: "wiggle" },
    { src: "/stickers/flower.png", className: "right-[5%] top-[46%] w-14 sm:w-16", delay: 1.22, motion: "floaty" },
    { src: "/stickers/pusheen-donut.png", className: "left-[2%] bottom-[28%] w-14", delay: 1.3, motion: "wiggle" },
    { src: "/stickers/monkey.png", className: "right-[2%] bottom-[30%] w-16 sm:w-20", delay: 1.38, motion: "floaty" },
    { src: "/stickers/shell.png", className: "left-[22%] bottom-[22%] w-10", delay: 1.45, motion: "floaty" },
    { src: "/stickers/i-heart-cats.png", className: "right-[20%] bottom-[20%] w-12", delay: 1.52, motion: "wiggle" },
    { src: "/stickers/cookie-star.png", className: "left-[40%] bottom-[14%] w-11", delay: 1.58, motion: "twinkle" },
    { src: "/stickers/miffy.png", className: "right-[38%] bottom-[12%] w-12", delay: 1.64, motion: "floaty" },
    { src: "/stickers/orchid.png", className: "left-[8%] bottom-[8%] w-14", delay: 1.7, motion: "floaty" },
    { src: "/stickers/clip.png", className: "right-[10%] bottom-[8%] w-12", delay: 1.76, motion: "wiggle" },
  ];

  return (
    <m.section
      className="letter-stage relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col items-center overflow-hidden px-3 pb-16 pt-20 sm:max-w-xl sm:px-5"
      initial={
        reduced
          ? { opacity: 0 }
          : {
              opacity: 0,
              scale: 0.42,
              y: 120,
              rotateX: 58,
              filter: "blur(8px)",
            }
      }
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        rotateX: 0,
        filter: "blur(0px)",
      }}
      exit={{
        opacity: 0,
        y: -30,
        filter: "blur(8px)",
        transition: { duration: 0.55, ease: easeSoft },
      }}
      transition={{
        duration: reduced ? 0.35 : 1.55,
        ease: easeCinema,
      }}
      style={{ perspective: 1400, transformOrigin: "50% 85%" }}
    >
      {/* Carta física que se “abre” */}
      <m.div
        className="letter-card relative w-full overflow-hidden"
        initial={reduced ? false : { scaleY: 0.12, opacity: 0.6 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{
          duration: reduced ? 0.2 : 1.35,
          delay: reduced ? 0 : 0.18,
          ease: easeCinema,
        }}
        style={{ transformOrigin: "50% 100%" }}
      >
        {/* Título */}
        <m.h1
          className="letter-headline title-read relative z-20 px-2 text-center text-[clamp(1.65rem,7.5vw,2.85rem)] sm:text-5xl"
          initial={{ opacity: 0, y: 28, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: reduced ? 0 : 0.85, duration: 0.9, ease: easeCinema }}
        >
          {event.letterHeadline}
        </m.h1>

        {/* Stickers collage */}
        {stickers.map((s) => (
          <m.img
            key={s.src + s.className}
            src={s.src}
            alt=""
            className={`pointer-events-none absolute z-10 drop-shadow-md ${s.className} ${s.motion ?? ""}`}
            style={{ rotate: `${s.rotate ?? 0}deg` }}
            initial={{ opacity: 0, scale: 0.2, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: reduced ? 0 : s.delay,
              duration: 0.85,
              ease: easeCinema,
              type: reduced ? "tween" : "spring",
              stiffness: 160,
              damping: 14,
            }}
          />
        ))}

        {/* Velas 22 — centro */}
        <m.div
          className="relative z-20 mx-auto mt-3 flex justify-center"
          initial={{ opacity: 0, scale: 0.55, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 1.05, duration: 1.1, ease: easeCinema }}
        >
          <img
            src="/stickers/candles-22.png"
            alt="22"
            className="h-[7.5rem] w-auto object-contain sm:h-40"
          />
        </m.div>

        {/* Fotos tipo scrapbook */}
        <div className="relative z-20 mt-2 flex w-full items-end justify-center gap-3 px-2 sm:gap-5">
          <m.div
            className="letter-photo rotate-[-8deg]"
            initial={{ opacity: 0, x: -48, rotate: -22, scale: 0.7 }}
            animate={{ opacity: 1, x: 0, rotate: -8, scale: 1 }}
            transition={{ delay: reduced ? 0 : 1.35, duration: 1, ease: easeCinema }}
          >
            <div className="relative h-28 w-24 overflow-hidden rounded-2xl border-[3px] border-[#7eb6ff] bg-white shadow-lg sm:h-36 sm:w-28">
              <Image src="/photos/kenya-10.png" alt="Kenya" fill className="object-cover" sizes="120px" />
            </div>
          </m.div>

          <m.div
            className="letter-photo relative rotate-[6deg]"
            initial={{ opacity: 0, x: 48, rotate: 24, scale: 0.7 }}
            animate={{ opacity: 1, x: 0, rotate: 6, scale: 1 }}
            transition={{ delay: reduced ? 0 : 1.5, duration: 1.05, ease: easeCinema }}
          >
            <m.img
              src="/stickers/k-pink.png"
              alt=""
              className="absolute -left-3 -top-5 z-10 h-10 w-auto drop-shadow sm:h-12"
              initial={{ opacity: 0, scale: 0, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: -12 }}
              transition={{ delay: reduced ? 0 : 1.9, type: "spring", stiffness: 200, damping: 12 }}
            />
            <div className="relative h-36 w-28 overflow-hidden rounded-2xl border-[3px] border-white bg-white shadow-lg sm:h-44 sm:w-32">
              <div className="absolute inset-0">
                <KenyaFaceVideo />
              </div>
            </div>
          </m.div>
        </div>

        <m.div
          className="relative z-20 mt-4 flex flex-wrap items-center justify-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 1.75, duration: 0.8 }}
        >
          <img src="/stickers/kitten.png" alt="" className="h-14 w-auto object-contain floaty sm:h-16" />
          <img src="/stickers/party-hat.png" alt="" className="h-10 w-auto object-contain wiggle" />
          <img src="/stickers/pusheen.png" alt="" className="h-12 w-auto object-contain floaty" />
          <img src="/stickers/rosette.png" alt="" className="h-16 w-auto object-contain floaty" />
        </m.div>

        <m.p
          className="letter-subline relative z-20 mt-4 px-4 text-center text-[clamp(1.25rem,5vw,1.85rem)] leading-snug"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 1.95, duration: 0.85, ease: easeCinema }}
        >
          {event.letterSubline}
        </m.p>

        <m.button
          type="button"
          onClick={onNext}
          className="seal relative z-20 mx-auto mt-7 cursor-pointer font-[family-name:var(--font-script)] text-4xl"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: reduced ? 0 : 2.15, type: "spring", stiffness: 180, damping: 12 }}
        >
          K
        </m.button>
        <m.p
          className="relative z-20 mt-2 text-center font-[family-name:var(--font-script)] text-xl text-ink/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 2.3, duration: 0.6 }}
        >
          click o desliza para ver detalles
        </m.p>
      </m.div>
    </m.section>
  );
}

function DetailsStage({ onNext }: { onNext: () => void }) {
  return (
    <m.section
      className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col items-center px-5 pb-14 pt-24 text-center"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
      transition={{ duration: 0.75, ease: easeSoft }}
    >
      <Sticker src="/stickers/flower.png" className="left-[6%] top-[11%] w-12" delay="0.1s" motion="floaty" depth={16} />
      <Sticker src="/stickers/black-cat.png" className="right-[6%] top-[13%] w-12" delay="0.25s" motion="floaty" depth={18} />
      <Sticker src="/stickers/leopard-star.png" className="left-[12%] top-[19%] w-10" delay="0.4s" motion="twinkle" depth={22} />
      <Sticker src="/stickers/angelic-star.png" className="right-[10%] top-[21%] w-11" delay="0.5s" motion="wiggle" depth={14} />
      <h2 className="title-read font-[family-name:var(--font-script)] text-6xl text-blush-deep">Ubicación</h2>
      <div className="mt-6 w-full rounded-[32px] bg-white/80 px-6 py-8 shadow-[0_16px_40px_rgba(90,68,80,0.08)]">
        <p className="font-[family-name:var(--font-display)] text-3xl text-sky-deep">
          {event.weekday} {event.time}
        </p>
        <p className="mt-1 text-2xl font-extrabold tracking-wide">{event.dateShort}</p>
        <p className="mt-5 text-xl">{event.venue}</p>
        <p className="mt-1 text-ink/60">{event.address}</p>
        <a
          href={event.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block font-[family-name:var(--font-script)] text-2xl text-blush underline-offset-4 hover:underline"
        >
          Abrir Mapa
        </a>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {event.dress.swatches.map((color) => (
          <span
            key={color}
            className="size-11 rounded-full border-4 border-white shadow-md"
            style={{ background: color }}
          />
        ))}
      </div>
      <h3 className="title-read mt-6 font-[family-name:var(--font-script)] text-5xl text-sky-deep">{event.dress.title}</h3>
      <p className="mt-3 max-w-md text-ink">{event.dress.body}</p>
      <p className="mt-2 italic text-ink/70">{event.dress.note}</p>

      <div className="mt-8 flex items-center gap-3">
        <img src="/stickers/i-heart-cats.png" alt="" className="h-12 w-12 object-contain" />
        {event.photos.extra.slice(4).map((photo) => (
          <div key={photo.src} className="photo-tile relative h-24 w-20 rotate-[-4deg] last:rotate-[6deg]">
            <Image src={photo.src} alt={photo.alt} fill className="object-cover" sizes="96px" />
          </div>
        ))}
        <img src="/stickers/pusheen.png" alt="" className="h-12 w-12 object-contain floaty" />
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-10 cursor-pointer rounded-full bg-blush px-8 py-3 font-[family-name:var(--font-display)] text-xl text-white shadow-lg shadow-blush/40"
      >
        Confirmar tu Asistencia
      </button>
      <p className="mt-2 text-sm text-ink/50">Da click o desliza para el {event.dateShort}</p>
    </m.section>
  );
}

function RsvpStage({ onDone }: { onDone: () => void }) {
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
    "mt-1 w-full rounded-2xl border border-blush/30 bg-white px-4 py-3 text-ink outline-none focus:border-blush";

  return (
    <m.section
      className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center overflow-visible px-5 pb-16 pt-24"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
      transition={{ duration: 0.75, ease: easeSoft }}
    >
      <Sticker src="/stickers/heart.png" className="left-[8%] top-[13%] w-10" delay="0.1s" motion="twinkle" depth={22} />
      <Sticker src="/stickers/pusheen-donut.png" className="right-[6%] top-[15%] w-14" delay="0.25s" motion="wiggle" depth={16} />
      <img src="/stickers/miffy.png" alt="" className="mx-auto mb-2 h-12 w-auto object-contain floaty" />
      <h2 className="text-center font-[family-name:var(--font-script)] text-5xl text-blush">¿Vienes?</h2>
      <p className="mt-2 text-center font-[family-name:var(--font-script)] text-xl leading-snug text-blush-deep">
        {event.rsvp.raffleNote}
      </p>
      <form
        onSubmit={submit}
        data-no-swipe
        className="mt-8 space-y-4 overflow-visible rounded-[32px] bg-white/85 p-6 shadow-[0_16px_40px_rgba(90,68,80,0.08)]"
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
              className={`rounded-2xl px-2 py-3 text-sm font-bold ${
                attending === "si" ? "bg-blush text-white" : "bg-lemon text-ink"
              }`}
            >
              Sí voy
            </button>
            <button
              type="button"
              onClick={tryMaybe}
              className={`dodge-btn rounded-2xl px-2 py-3 text-sm font-bold ${
                attending === "talvez" ? "bg-blush text-white" : "bg-lemon text-ink"
              }`}
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
              className="dodge-btn rounded-2xl bg-lemon px-2 py-3 text-sm font-bold text-ink"
              style={{ transform: `translate(${noShift.x}px, ${noShift.y}px)` }}
            >
              No puedo
            </button>
          </div>
        </div>
        {nudge && (
          <p className="text-center font-[family-name:var(--font-script)] text-xl text-blush-deep">
            {nudge}
          </p>
        )}
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
        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full cursor-pointer rounded-full bg-sky py-3 font-extrabold text-ink disabled:opacity-60"
        >
          {status === "saving" ? "Enviando…" : "Confirmar"}
        </button>
      </form>
      <div className="mt-6 flex items-end justify-center gap-5">
        <img src="/stickers/orchid.png" alt="" className="h-12 w-12 object-contain floaty" />
        <img src="/stickers/monkey.png" alt="" className="h-14 w-14 object-contain floaty" />
        <img src="/stickers/k-pink.png" alt="" className="h-11 w-auto object-contain wiggle" />
      </div>
    </m.section>
  );
}

function ThanksStage({ onHome }: { onHome: () => void }) {
  return (
    <m.section
      className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-5 pt-16 text-center"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
      transition={{ duration: 0.75, ease: easeSoft }}
    >
      <div className="photo-tile relative mb-6 h-36 w-28 rotate-[-6deg]">
        <Image src="/photos/kenya-04.png" alt="Kenya" fill className="object-cover" sizes="120px" />
      </div>
      <img src="/stickers/k-denim.png" alt="" className="h-14 w-auto object-contain wiggle" />
      <h2 className="mt-4 font-[family-name:var(--font-script)] text-5xl text-blush">Te veo ahí</h2>
      <p className="mt-2 font-[family-name:var(--font-display)] text-sky-deep">{event.dateShort}</p>
      <button
        type="button"
        onClick={onHome}
        className="mt-8 cursor-pointer text-ink/60 underline-offset-4 hover:underline"
      >
        regreso al inicio
      </button>
    </m.section>
  );
}

const GALLERY = [...event.photos.hero, ...event.photos.extra];
const HERO_SLOTS = [
  { rotate: "-8deg", tall: false },
  { rotate: "3deg", tall: true },
  { rotate: "8deg", tall: false },
] as const;

function PhotoCarousel() {
  const [order, setOrder] = useState(() => [...GALLERY]);
  const rootRef = useRef<HTMLDivElement>(null);
  const prevRects = useRef(new Map<string, DOMRect>());
  const primed = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      setOrder((list) => {
        const [first, ...rest] = list;
        const next = [...rest];
        next.splice(6, 0, first);
        return next;
      });
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = [...root.querySelectorAll<HTMLElement>("[data-photo]")];
    const nextRects = new Map<string, DOMRect>();
    for (const el of nodes) {
      const src = el.dataset.photo;
      if (src) nextRects.set(src, el.getBoundingClientRect());
    }

    const lastRects = prevRects.current;
    prevRects.current = nextRects;
    if (!primed.current) {
      primed.current = true;
      return;
    }
    if (prefersReducedMotion()) return;

    for (const el of nodes) {
      const src = el.dataset.photo;
      if (!src) continue;
      const last = lastRects.get(src);
      const next = nextRects.get(src);
      if (!last || !next) continue;
      const dx = last.left - next.left;
      const dy = last.top - next.top;
      const sx = last.width / next.width;
      const sy = last.height / next.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) {
        continue;
      }
      el.getAnimations().forEach((animation) => animation.cancel());
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transform: "translate(0, 0) scale(1)" },
        ],
        { duration: 1100, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
      );
    }
  }, [order]);

  const featured = HERO_SLOTS.map((slot, index) => ({
    ...slot,
    photo: order[index],
  }));
  const thumbs = order.slice(3, 7);

  return (
    <div ref={rootRef} className="mt-7">
      <div className="flex items-end justify-center gap-2 sm:gap-3">
        {featured.map((item) => (
          <div
            key={item.photo.src}
            data-photo={item.photo.src}
            className="photo-flip"
          >
            <div className="photo-frame w-[5.5rem] sm:w-32" style={{ transform: `rotate(${item.rotate})` }}>
              <div className={`relative overflow-hidden rounded-xl ${item.tall ? "h-36 sm:h-48" : "h-28 sm:h-40"}`}>
                <Image src={item.photo.src} alt={item.photo.alt} fill className="object-cover" sizes="140px" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-center gap-2">
        {thumbs.map((photo) => (
          <div
            key={photo.src}
            data-photo={photo.src}
            className="photo-flip photo-tile relative h-14 w-14 sm:h-20 sm:w-20"
          >
            <Image src={photo.src} alt={photo.alt} fill className="object-cover" sizes="80px" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Sticker({
  src,
  className,
  delay,
  motion = "floaty",
  depth = 14,
  scatter,
}: {
  src: string;
  className: string;
  delay?: string;
  motion?: "floaty" | "wiggle" | "spin-slow" | "twinkle";
  depth?: number;
  scatter?: { x: string; y: string; r: string };
}) {
  const style: CSSVars = {
    "--depth": `${depth}px`,
    "--sx": scatter?.x ?? "48px",
    "--sy": scatter?.y ?? "-72px",
    "--sr": scatter?.r ?? "16deg",
  };
  if (delay) style.animationDelay = delay;

  return (
    <span className={`sticker parallax-layer ${className}`} style={style}>
      <span className="sticker-inner pop" style={delay ? { animationDelay: delay } : undefined}>
        <img src={src} alt="" className={`block h-auto w-full ${motion}`} style={delay ? { animationDelay: delay } : undefined} />
      </span>
    </span>
  );
}
