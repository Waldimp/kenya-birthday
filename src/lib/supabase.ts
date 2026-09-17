import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const INVITE_SCHEMA = "invite";

export type RsvpRow = {
  id: string;
  name: string;
  attending: "si" | "no" | "talvez";
  guests: number;
  phone: string | null;
  message: string | null;
  created_at: string;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable ${name}`);
  }
  return value;
}

const clientOptions = {
  db: { schema: INVITE_SCHEMA },
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function supabasePublic(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    clientOptions,
  );
}

export function supabaseAdmin(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    clientOptions,
  );
}
