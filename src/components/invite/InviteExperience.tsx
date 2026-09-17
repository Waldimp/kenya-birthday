"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { event } from "@/lib/event";

type Stage = "envelope" | "letter" | "details" | "rsvp" | "thanks";

export function InviteExperience() {
  const [stage, setStage] = useState<Stage>("envelope");
  const [open, setOpen] = useState(false);

  function openEnvelope() {
    setOpen(true);
    window.setTimeout(() => setStage("letter"), 780);
  }

  return (
    <main className={`party relative min-h-dvh overflow-x-hidden ${stage === "envelope" ? "" : "party-soft"}`}>
      {stage === "envelope" && <EnvelopeStage open={open} onOpen={openEnvelope} />}
      {stage === "letter" && <LetterStage onNext={() => setStage("details")} />}
      {stage === "details" && <DetailsStage onNext={() => setStage("rsvp")} />}
      {stage === "rsvp" && <RsvpStage onDone={() => setStage("thanks")} />}
      {stage === "thanks" && (
        <ThanksStage
          onHome={() => {
            setOpen(false);
            setStage("envelope");
          }}
        />
      )}
    </main>
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

          <Sticker src="/stickers/star-gingham.png" className="left-[4%] top-[6%] w-[18%]" delay="0.05s" motion="floaty" />
          <Sticker src="/stickers/disco.png" className="right-[3%] top-[5%] w-[16%]" delay="0.15s" motion="spin-slow" />
          <Sticker src="/stickers/clip.png" className="left-[16%] top-[17%] w-[13%]" delay="0.2s" motion="wiggle" />
          <Sticker src="/stickers/heart.png" className="left-[42%] top-[11%] w-[10%]" delay="0.28s" motion="twinkle" />
          <Sticker src="/stickers/angelic-star.png" className="right-[15%] top-[17%] w-[14%]" delay="0.35s" motion="floaty" />
          <Sticker src="/stickers/bow.png" className="right-[8%] top-[24%] w-[14%]" delay="0.42s" motion="wiggle" />
          <Sticker src="/stickers/rosette.png" className="right-[-7%] top-[32%] w-[30%]" delay="0.2s" motion="floaty" />
          <Sticker src="/stickers/pearl-star.png" className="left-[8%] top-[38%] w-[11%]" delay="0.5s" motion="twinkle" />
          <Sticker src="/stickers/leopard-star.png" className="right-[8%] top-[46%] w-[12%]" delay="0.55s" motion="wiggle" />
          <Sticker src="/stickers/flower.png" className="left-[6%] bottom-[28%] w-[16%]" delay="0.45s" motion="floaty" />
          <Sticker src="/stickers/monkey.png" className="left-[-8%] bottom-[14%] w-[32%]" delay="0.3s" motion="floaty" />
          <Sticker src="/stickers/orchid.png" className="right-[-6%] bottom-[16%] w-[26%]" delay="0.4s" motion="floaty" />
          <Sticker src="/stickers/k-denim.png" className="left-[12%] bottom-[6%] w-[15%]" delay="0.6s" motion="wiggle" />
          <Sticker src="/stickers/k-pink.png" className="right-[12%] bottom-[7%] w-[12%]" delay="0.7s" motion="floaty" />
          <Sticker src="/stickers/cookie-star.png" className="left-[38%] bottom-[4%] w-[14%]" delay="0.8s" motion="twinkle" />
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
    <section className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col items-center overflow-hidden px-5 py-12 text-center">
      <Sticker src="/stickers/cinnamoroll.png" className="right-[3%] top-[5%] w-16 sm:w-24" delay="0.1s" motion="floaty" />
      <Sticker src="/stickers/deer.png" className="left-[2%] top-[8%] w-16 sm:w-24" delay="0.2s" motion="floaty" />
      <Sticker src="/stickers/pearl-star.png" className="left-[14%] top-[3%] w-12" delay="0.3s" motion="twinkle" />
      <Sticker src="/stickers/disco.png" className="right-[12%] top-[14%] w-12 sm:w-16" delay="0.15s" motion="spin-slow" />
      <Sticker src="/stickers/little-twin.png" className="left-[8%] top-[22%] w-14" delay="0.45s" motion="wiggle" />
      <Sticker src="/stickers/bow.png" className="right-[6%] top-[28%] w-12" delay="0.5s" motion="wiggle" />

      <p className="title-read lift-in font-[family-name:var(--font-script)] text-3xl text-sky-deep sm:text-4xl">
        {event.inviteLine}
      </p>
      <h1 className="title-read lift-in mt-1 font-[family-name:var(--font-script)] text-7xl leading-none text-blush-deep sm:text-8xl">
        {event.honoree}
      </h1>

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

      <MusicPlayer />
      <button
        type="button"
        onClick={onNext}
        className="seal lift-in mt-7 cursor-pointer font-[family-name:var(--font-script)] text-4xl"
      >
        K
      </button>
      <p className="mt-2 font-[family-name:var(--font-script)] text-xl text-ink/70">
        click para ver detalles
      </p>
    </section>
  );
}

function DetailsStage({ onNext }: { onNext: () => void }) {
  return (
    <section className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col items-center px-5 py-14 text-center">
      <Sticker src="/stickers/shell.png" className="left-[6%] top-[8%] w-12" delay="0.1s" motion="floaty" />
      <Sticker src="/stickers/black-cat.png" className="right-[6%] top-[10%] w-12" delay="0.25s" motion="floaty" />
      <Sticker src="/stickers/leopard-star.png" className="left-[12%] top-[16%] w-10" delay="0.4s" motion="twinkle" />
      <Sticker src="/stickers/angelic-star.png" className="right-[10%] top-[18%] w-11" delay="0.5s" motion="wiggle" />
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
      <p className="mt-2 text-sm text-ink/50">Da click acá para el {event.dateShort}</p>
    </section>
  );
}

function RsvpStage({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [attending, setAttending] = useState<"si" | "no" | "talvez">("si");
  const [guests, setGuests] = useState(1);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

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
    <section className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center overflow-hidden px-5 py-16">
      <Sticker src="/stickers/heart.png" className="left-[8%] top-[10%] w-10" delay="0.1s" motion="twinkle" />
      <Sticker src="/stickers/pusheen-donut.png" className="right-[6%] top-[12%] w-14" delay="0.25s" motion="wiggle" />
      <img src="/stickers/miffy.png" alt="" className="mx-auto mb-2 h-12 w-auto object-contain floaty" />
      <h2 className="text-center font-[family-name:var(--font-script)] text-5xl text-blush">¿Vienes?</h2>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-[32px] bg-white/85 p-6 shadow-[0_16px_40px_rgba(90,68,80,0.08)]">
        <label className="block text-sm font-semibold text-ink/70">
          Tu nombre
          <input required value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["si", "Sí voy"],
              ["talvez", "Tal vez"],
              ["no", "No puedo"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setAttending(value)}
              className={`rounded-2xl px-2 py-3 text-sm font-bold ${
                attending === value ? "bg-blush text-white" : "bg-lemon text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {attending !== "no" && (
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
        )}
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
    </section>
  );
}

function ThanksStage({ onHome }: { onHome: () => void }) {
  return (
    <section className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-5 text-center">
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

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
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

  const featured = HERO_SLOTS.map((slot, index) => ({
    ...slot,
    photo: order[index],
  }));
  const thumbs = order.slice(3, 7);

  return (
    <div className="mt-7">
      <div className="flex items-end justify-center gap-2 sm:gap-3">
        {featured.map((item, index) => (
          <div
            key={`hero-${item.photo.src}`}
            className="photo-up"
            style={{ animationDelay: `${index * 90}ms` }}
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
        {thumbs.map((photo, index) => (
          <div
            key={`thumb-${photo.src}`}
            className="photo-down photo-tile relative h-14 w-14 sm:h-20 sm:w-20"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <Image src={photo.src} alt={photo.alt} fill className="object-cover" sizes="80px" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio || missing) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setMissing(true);
    }
  }

  return (
    <div className="lift-in mt-7">
      <audio ref={audioRef} src={event.audioSrc} loop onError={() => setMissing(true)} />
      <div className="flex items-center justify-center gap-2">
        <img src="/stickers/records.png" alt="" className="h-8 w-auto object-contain" />
        <p className="font-[family-name:var(--font-script)] text-xl">
          {event.song} by {event.artist}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        className="mt-2 cursor-pointer rounded-full bg-lilac px-4 py-1.5 text-sm font-bold text-ink"
      >
        {missing ? "agrega /audio/soledad.mp3" : playing ? "pausar" : "click para reproducir"}
      </button>
    </div>
  );
}

function Sticker({
  src,
  className,
  delay,
  motion = "floaty",
}: {
  src: string;
  className: string;
  delay?: string;
  motion?: "floaty" | "wiggle" | "spin-slow" | "twinkle";
}) {
  return (
    <span className={`sticker pop ${className}`} style={delay ? { animationDelay: delay } : undefined}>
      <img src={src} alt="" className={`block h-auto w-full ${motion}`} style={delay ? { animationDelay: delay } : undefined} />
    </span>
  );
}
