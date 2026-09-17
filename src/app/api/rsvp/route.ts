import { NextResponse } from "next/server";
import { hasSupabaseConfig, supabaseAdmin, supabasePublic } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "El formulario todavía no está conectado." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    attending?: string;
    guests?: number;
    phone?: string;
    message?: string;
  } | null;

  const name = body?.name?.trim() ?? "";
  const attending = body?.attending;
  const guests = Number(body?.guests ?? 1);
  const phone = body?.phone?.trim() || null;
  const message = body?.message?.trim() || null;

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  }
  if (attending !== "si" && attending !== "no" && attending !== "talvez") {
    return NextResponse.json({ error: "Elige si vienes o no." }, { status: 400 });
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > 10) {
    return NextResponse.json({ error: "El número de personas no es válido." }, { status: 400 });
  }

  const payload = {
    name,
    attending,
    guests: attending === "no" ? 0 : guests,
    phone,
    message,
  };

  const client = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? supabaseAdmin()
    : supabasePublic();

  const { error } = await client.from("rsvps").insert(payload);
  if (error) {
    return NextResponse.json({ error: "No se pudo guardar el RSVP." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
