"use server";

import { publicClient } from "@/lib/supabase/clients";

export type TrackedOrder = {
  number: string;
  status: string;
  created_at: string;
  updated_at: string;
  total_cents: number;
  shipping_method: string;
  payment_method: string;
  items: { name: string; qty: number; line_total_cents: number }[];
};

export type TrackState = { order?: TrackedOrder; error?: string } | null;

export async function trackOrder(_prev: TrackState, form: FormData): Promise<TrackState> {
  const number = String(form.get("number") ?? "").trim().toUpperCase();
  const email = String(form.get("email") ?? "").trim();
  if (!/^GS-\d{5,8}$/.test(number)) return { error: "Въведете номера на поръчката, напр. GS-100001." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Въведете имейла, с който поръчахте." };

  const { data, error } = await publicClient().rpc("track_order", { p_number: number, p_email: email });
  if (error) return { error: "Проверката не успя. Опитайте отново." };
  if (!data) return { error: "Не намерихме поръчка с този номер и имейл." };
  return { order: data as unknown as TrackedOrder };
}
