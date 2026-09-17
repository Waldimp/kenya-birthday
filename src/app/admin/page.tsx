"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { RsvpRow } from "@/lib/supabase";

const labels = {
  si: "Va",
  no: "No va",
  talvez: "Tal vez",
} as const;

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/rsvps");
    if (res.status === 401) {
      setAuthed(false);
      setChecking(false);
      return;
    }
    const data = (await res.json()) as { rsvps?: RsvpRow[]; error?: string };
    if (!res.ok) {
      setError(data.error || "No se pudo cargar.");
      setChecking(false);
      return;
    }
    setRsvps(data.rsvps ?? []);
    setAuthed(true);
    setChecking(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "No se pudo entrar.");
      return;
    }
    setPassword("");
    await load();
  }

  const filtered = rsvps.filter((row) =>
    `${row.name} ${row.phone ?? ""} ${row.message ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  const stats = useMemo(() => {
    const si = rsvps.filter((r) => r.attending === "si");
    const no = rsvps.filter((r) => r.attending === "no");
    const talvez = rsvps.filter((r) => r.attending === "talvez");
    return {
      responses: rsvps.length,
      going: si.length,
      heads: si.reduce((sum, r) => sum + r.guests, 0),
      maybe: talvez.length,
      declined: no.length,
    };
  }, [rsvps]);

  function exportCsv() {
    const header = "nombre,asistencia,personas,whatsapp,mensaje,fecha";
    const rows = rsvps.map((r) =>
      [r.name, r.attending, r.guests, r.phone ?? "", r.message ?? "", r.created_at]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kenya-rsvps.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (checking) {
    return <div className="party grid min-h-dvh place-items-center text-ink">Cargando…</div>;
  }

  if (!authed) {
    return (
      <main className="party grid min-h-dvh place-items-center px-5">
        <form onSubmit={login} className="w-full max-w-sm space-y-4 rounded-3xl bg-white/85 p-8 shadow-lg">
          <h1 className="font-[family-name:var(--font-script)] text-4xl text-blush">Panel de Kenya</h1>
          <p className="text-sm text-ink/60">Solo para ver quién confirmó.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Clave"
            className="w-full rounded-xl border border-blush/30 bg-white px-4 py-3 outline-none focus:border-blush"
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button className="w-full rounded-full bg-blush py-3 text-white">Entrar</button>
        </form>
      </main>
    );
  }

  return (
    <main className="party min-h-dvh px-5 py-10 text-ink">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm tracking-[0.2em] text-blush/80">ADMIN</p>
            <h1 className="font-[family-name:var(--font-script)] text-5xl text-blush">
              Invitados de Kenya
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="rounded-full border border-blush/40 bg-white px-4 py-2 text-sm">
              Exportar CSV
            </button>
            <button
              onClick={async () => {
                await fetch("/api/admin/logout", { method: "POST" });
                setAuthed(false);
              }}
              className="rounded-full px-4 py-2 text-sm text-ink/60"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Respuestas" value={stats.responses} />
          <Stat label="Van" value={stats.going} />
          <Stat label="Personas" value={stats.heads} />
          <Stat label="Tal vez" value={stats.maybe} />
          <Stat label="No van" value={stats.declined} />
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, WhatsApp o mensaje"
          className="mt-8 w-full rounded-2xl border border-blush/30 bg-white px-4 py-3 outline-none focus:border-blush"
        />

        <div className="mt-6 overflow-x-auto rounded-3xl border border-blush/20 bg-white/80">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-lilac/40 text-ink/60">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Asistencia</th>
                <th className="px-4 py-3">Personas</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Mensaje</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-blush/15">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{labels[row.attending]}</td>
                  <td className="px-4 py-3">{row.guests}</td>
                  <td className="px-4 py-3">{row.phone || "—"}</td>
                  <td className="px-4 py-3 text-ink/70">{row.message || "—"}</td>
                  <td className="px-4 py-3 text-ink/50">
                    {new Date(row.created_at).toLocaleString("es-SV")}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink/50">
                    Todavía no hay RSVPs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
      <p className="text-xs tracking-widest text-ink/50">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-script)] text-4xl text-blush">{value}</p>
    </div>
  );
}
