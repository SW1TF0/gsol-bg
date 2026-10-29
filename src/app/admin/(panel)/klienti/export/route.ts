import { NextResponse } from "next/server";
import { sessionClient } from "@/lib/supabase/clients";
import { csvRow } from "@/lib/customers";

// CSV с абонираните клиенти — за бюлетин. Само дали съгласие при поръчка; отписаните не влизат.
export async function GET() {
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new NextResponse("Нужен е вход", { status: 401 });

  const { data: staff } = await db.from("staff").select("role").eq("user_id", user.id).maybeSingle();
  if (!staff || !["admin", "manager"].includes(staff.role)) return new NextResponse("Няма достъп", { status: 403 });

  const { data, error } = await db
    .from("customer_stats")
    .select("email, first_name, last_name, marketing_opt_in_at, orders_count, last_order_at")
    .eq("marketing_opt_in", true)
    .order("marketing_opt_in_at", { ascending: true });
  if (error) return new NextResponse("Грешка при четене", { status: 500 });

  const rows = [
    csvRow(["имейл", "име", "фамилия", "съгласие от", "поръчки", "последна поръчка"]),
    ...(data ?? []).map((c) =>
      csvRow([c.email, c.first_name, c.last_name, c.marketing_opt_in_at, c.orders_count, c.last_order_at]),
    ),
  ];
  const csv = "﻿" + rows.join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gsol-abonirani.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
