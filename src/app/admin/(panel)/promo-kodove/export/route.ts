import { NextResponse, type NextRequest } from "next/server";
import { sessionClient } from "@/lib/supabase/clients";

// CSV с кодовете от една партида — за печат на флаери или изпращане на партньор.
export async function GET(request: NextRequest) {
  const batch = request.nextUrl.searchParams.get("partida") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(batch)) return new NextResponse("Невалидна партида", { status: 400 });

  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new NextResponse("Нужен е вход", { status: 401 });

  // RLS връща редове само на мениджъри и администратори
  const { data, error } = await db
    .from("promo_codes")
    .select("code, times_used, usage_limit, is_active, ends_at")
    .eq("batch_id", batch)
    .order("code");
  if (error || !data?.length) return new NextResponse("Няма достъп или кодове", { status: 404 });

  const rows = [
    ["код", "използван", "лимит", "активен", "валиден до"],
    ...data.map((r) => [r.code, String(r.times_used), String(r.usage_limit ?? ""), r.is_active ? "да" : "не", r.ends_at ?? ""]),
  ];
  const csv = "﻿" + rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="promo-${batch.slice(0, 8)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
