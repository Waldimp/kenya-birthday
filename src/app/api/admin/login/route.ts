import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/lib/admin";

export async function POST(request: Request) {
  const expected = adminToken();
  if (!expected || !process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Falta ADMIN_PASSWORD en el entorno." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (body?.password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Clave incorrecta." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
