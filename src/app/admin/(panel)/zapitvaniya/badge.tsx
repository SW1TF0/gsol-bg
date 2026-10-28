import { inquiryStatusLabels } from "@/lib/inquiries";

const tones: Record<string, string> = {
  new: "bg-accent text-white",
  in_progress: "bg-[#2563eb] text-white",
  done: "bg-ok text-black",
  spam: "bg-surface text-dim",
};

export function InquiryStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex h-6 items-center px-2.5 font-display text-[11px] uppercase tracking-wide ${tones[status] ?? "bg-surface"}`}>
      {inquiryStatusLabels[status] ?? status}
    </span>
  );
}
