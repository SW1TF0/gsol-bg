"use client";

import { usePathname } from "next/navigation";
import { legalLinks } from "@/lib/site";

const hidden = new Set(["/za-gsol", ...legalLinks.map((l) => `/${l.slug}`)]);

/** Лентата с отзиви не се показва на правните страници, в чекаута и на „Кои сме ние“ */
export function PrefooterGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (hidden.has(path) || path.startsWith("/porachka")) return null;
  return <>{children}</>;
}
