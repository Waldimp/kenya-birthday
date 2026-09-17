import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { hasSupabaseConfig, supabaseAdmin, type RsvpRow } from "@/lib/supabase";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!hasSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase no está configurado." },
      { status: 503 },
    );
  }

  const { data, error } = await supabaseAdmin()
    .from("rsvps")
    .select("id,name,attending,guests,phone,message,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "No se pudieron cargar los RSVP." }, { status: 500 });
  }

  return NextResponse.json({ rsvps: (data ?? []) as RsvpRow[] });
}
