"use client";

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { event } from "@/lib/event";

type Stage = "envelope" | "letter" | "details" | "rsvp" | "thanks";

const OPEN_MS = 1450;
const JOURNEY = [
  { id: "envelope" as const, label: "sobre", mark: "✉" },
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
    window.setTimeout(() => setStage("letter"), delay);
  }

  function goNext() {
    const current = stageRef.current;
    if (current === "envelope") {
      openEnvelope();
      return;
    }
    if (current === "letter") goToStage("details");
    else if (current === "details") goToStage("rsvp");
  }

  function goPrev() {
    const current = stageRef.current;
    if (current === "letter") goToStage("envelope");
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

  return (
    <main
      ref={rootRef}
      className={`party relative min-h-dvh overflow-x-hidden ${stage === "envelope" ? "" : "party-soft"}`}
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
      {stage === "envelope" && <EnvelopeStage open={open} onOpen={openEnvelope} />}
      {stage === "letter" && <LetterStage onNext={() => goToStage("details")} />}
      {stage === "details" && <DetailsStage onNext={() => goToStage("rsvp")} />}
      {stage === "rsvp" && <RsvpStage onDone={() => goToStage("thanks")} />}
      {stage === "thanks" && <ThanksStage onHome={() => goToStage("envelope")} />}
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

function EnvelopeStage({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  return (
    <section className="envelope-stage">
      <button
        type="button"
        onClick={onOpen}
        className={`envelope-hero ${open ? "open" : ""}`}
        aria-label="Abrir el sobre"
      >
        <div className="envelope-frame">
          <img
            src="/assets/envelope.png"
            alt="Sobre de ojalillo"
            width={593}
            height={718}
            className="envelope-photo"
          />

          <div className="envelope-copy">
            <p className="font-[family-name:var(--font-script)] text-[clamp(1.85rem,8vw,3.4rem)] leading-none text-sky-deep">
              te invito
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-[clamp(1.2rem,5.6vw,2.15rem)] leading-tight text-blush-deep">
              a mi fiesta
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-[clamp(1rem,4.2vw,1.55rem)] tracking-[0.18em] text-sky-deep">
              {event.dateShort}
            </p>
          </div>

          <Sticker src="/stickers/star-gingham.png" className="left-[4%] top-[6%] w-[18%]" delay="0.05s" motion="floaty" depth={22} scatter={{ x: "-64px", y: "-88px", r: "-18deg" }} />
          <Sticker src="/stickers/disco.png" className="right-[3%] top-[5%] w-[16%]" delay="0.15s" motion="spin-slow" depth={18} scatter={{ x: "72px", y: "-70px", r: "26deg" }} />
          <Sticker src="/stickers/clip.png" className="left-[16%] top-[17%] w-[13%]" delay="0.2s" motion="wiggle" depth={10} scatter={{ x: "-48px", y: "-40px", r: "-12deg" }} />
          <Sticker src="/stickers/heart.png" className="left-[42%] top-[11%] w-[10%]" delay="0.28s" motion="twinkle" depth={26} scatter={{ x: "12px", y: "-96px", r: "10deg" }} />
          <Sticker src="/stickers/angelic-star.png" className="right-[15%] top-[17%] w-[14%]" delay="0.35s" motion="floaty" depth={16} scatter={{ x: "58px", y: "-54px", r: "20deg" }} />
          <Sticker src="/stickers/bow.png" className="right-[8%] top-[24%] w-[14%]" delay="0.42s" motion="wiggle" depth={12} scatter={{ x: "80px", y: "-18px", r: "14deg" }} />
          <Sticker src="/stickers/rosette.png" className="right-[-7%] top-[32%] w-[30%]" delay="0.2s" motion="floaty" depth={20} scatter={{ x: "96px", y: "8px", r: "12deg" }} />
          <Sticker src="/stickers/pearl-star.png" className="left-[8%] top-[38%] w-[11%]" delay="0.5s" motion="twinkle" depth={24} scatter={{ x: "-70px", y: "12px", r: "-22deg" }} />
          <Sticker src="/stickers/leopard-star.png" className="right-[8%] top-[46%] w-[12%]" delay="0.55s" motion="wiggle" depth={14} scatter={{ x: "64px", y: "36px", r: "16deg" }} />
          <Sticker src="/stickers/flower.png" className="left-[6%] bottom-[28%] w-[16%]" delay="0.45s" motion="floaty" depth={18} scatter={{ x: "-78px", y: "48px", r: "-14deg" }} />
          <Sticker src="/stickers/monkey.png" className="left-[-8%] bottom-[14%] w-[32%]" delay="0.3s" motion="floaty" depth={8} scatter={{ x: "-90px", y: "70px", r: "-10deg" }} />
          <Sticker src="/stickers/orchid.png" className="right-[-6%] bottom-[16%] w-[26%]" delay="0.4s" motion="floaty" depth={9} scatter={{ x: "88px", y: "64px", r: "8deg" }} />
          <Sticker src="/stickers/k-denim.png" className="left-[12%] bottom-[6%] w-[15%]" delay="0.6s" motion="wiggle" depth={15} scatter={{ x: "-42px", y: "86px", r: "-20deg" }} />
          <Sticker src="/stickers/k-pink.png" className="right-[12%] bottom-[7%] w-[12%]" delay="0.7s" motion="floaty" depth={17} scatter={{ x: "46px", y: "90px", r: "18deg" }} />
          <Sticker src="/stickers/cookie-star.png" className="left-[38%] bottom-[4%] w-[14%]" delay="0.8s" motion="twinkle" depth={21} scatter={{ x: "8px", y: "102px", r: "6deg" }} />
        </div>
      </button>

      <p className="envelope-cta px-5 font-[family-name:var(--font-script)] text-2xl text-ink/80 sm:text-3xl">
        haz clic para abrir el sobre
      </p>
    </section>
  );
}

function LetterStage({ onNext }: { onNext: () => void }) {
  return (
    <section className="stage-in relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col items-center overflow-hidden px-5 pb-12 pt-24 text-center">
      <Sticker src="/stickers/cinnamoroll.png" className="right-[3%] top-[8%] w-16 sm:w-24" delay="0.1s" motion="floaty" depth={20} />
      <Sticker src="/stickers/deer.png" className="left-[2%] top-[11%] w-16 sm:w-24" delay="0.2s" motion="floaty" depth={16} />
      <Sticker src="/stickers/pearl-star.png" className="left-[14%] top-[6%] w-12" delay="0.3s" motion="twinkle" depth={24} />
      <Sticker src="/stickers/disco.png" className="right-[12%] top-[17%] w-12 sm:w-16" delay="0.15s" motion="spin-slow" depth={12} />
      <Sticker src="/stickers/little-twin.png" className="left-[8%] top-[25%] w-14" delay="0.45s" motion="wiggle" depth={10} />
      <Sticker src="/stickers/bow.png" className="right-[6%] top-[31%] w-12" delay="0.5s" motion="wiggle" depth={14} />

      <p className="title-read lift-in font-[family-name:var(--font-script)] text-3xl text-sky-deep sm:text-4xl">
        {event.inviteLine}
      </p>
      <h1 className="title-read lift-in mt-1 font-[family-name:var(--font-script)] text-7xl leading-none text-blush-deep sm:text-8xl">
        {event.honoree}
      </h1>
      <img
        src="/stickers/candles-22.png"
        alt="22"
        className="lift-in mt-3 h-24 w-auto object-contain sm:h-32"
      />

      <div className="mt-4 flex flex-wrap items-end justify-center gap-2 sm:gap-3">
        <img src="/stickers/monkey.png" alt="" className="h-14 w-14 object-contain floaty sm:h-20 sm:w-20" />
        <img src="/stickers/rosette.png" alt="" className="h-20 w-12 object-contain floaty sm:h-28 sm:w-16" style={{ animationDelay: "0.3s" }} />
        <img src="/stickers/k-pink.png" alt="" className="h-12 w-auto object-contain wiggle sm:h-16" />
        <img src="/stickers/k-denim.png" alt="" className="h-12 w-auto object-contain wiggle sm:h-16" style={{ animationDelay: "0.4s" }} />
        <img src="/stickers/flower.png" alt="" className="h-12 w-12 object-contain floaty sm:h-16 sm:w-16" style={{ animationDelay: "0.6s" }} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <img src="/stickers/heart.png" alt="" className="h-9 w-9 object-contain twinkle" />
        <img src="/stickers/star-gingham.png" alt="" className="h-12 w-12 object-contain floaty" />
        <img src="/stickers/pusheen-donut.png" alt="" className="h-10 w-auto object-contain wiggle" />
        <img src="/stickers/orchid.png" alt="" className="h-14 w-14 object-contain floaty sm:h-16 sm:w-16" style={{ animationDelay: "0.5s" }} />
        <img src="/stickers/miffy.png" alt="" className="h-10 w-auto object-contain floaty" style={{ animationDelay: "0.7s" }} />
        <img src="/stickers/cookie-star.png" alt="" className="h-10 w-10 object-contain twinkle" style={{ animationDelay: "0.2s" }} />
        <img src="/stickers/clip.png" alt="" className="h-12 w-auto object-contain wiggle" />
      </div>

      <p className="lift-in mt-4 max-w-md text-base text-ink sm:text-lg">
        acompañame a celebrar otro año de mi vida
      </p>

      <PhotoCarousel />

      <button
        type="button"
        onClick={onNext}
        className="seal lift-in mt-7 cursor-pointer font-[family-name:var(--font-script)] text-4xl"
      >
        K
      </button>
      <p className="mt-2 font-[family-name:var(--font-script)] text-xl text-ink/70">
        click o desliza para ver detalles
      </p>
    </section>
  );
}

function DetailsStage({ onNext }: { onNext: () => void }) {
  return (
    <section className="stage-in relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col items-center px-5 pb-14 pt-24 text-center">
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
    </section>
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
    <section className="stage-in relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center overflow-visible px-5 pb-16 pt-24">
      <Sticker src="/stickers/heart.png" className="left-[8%] top-[13%] w-10" delay="0.1s" motion="twinkle" depth={22} />
      <Sticker src="/stickers/pusheen-donut.png" className="right-[6%] top-[15%] w-14" delay="0.25s" motion="wiggle" depth={16} />
      <img src="/stickers/miffy.png" alt="" className="mx-auto mb-2 h-12 w-auto object-contain floaty" />
      <h2 className="text-center font-[family-name:var(--font-script)] text-5xl text-blush">¿Vienes?</h2>
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
    </section>
  );
}

function ThanksStage({ onHome }: { onHome: () => void }) {
  return (
    <section className="stage-in relative z-10 flex min-h-dvh flex-col items-center justify-center px-5 pt-16 text-center">
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
    </section>
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
