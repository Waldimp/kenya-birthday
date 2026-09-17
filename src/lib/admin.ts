import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "kenya_admin";

export function adminToken() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  const secret = process.env.ADMIN_SECRET || password;
  return createHmac("sha256", secret).update(`kenya:${password}`).digest("hex");
}

export async function isAdmin() {
  const expected = adminToken();
  if (!expected) return false;
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === expected;
}
