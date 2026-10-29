import "server-only";
import type { Email } from "./templates";

// Изпращане през Resend (https://resend.com). Ключът е само на сървъра — RESEND_API_KEY в .env.local
// или в настройките на хостинга. Без ключ писмата не се изпращат, а сайтът работи нормално.

export type SendResult = "sent" | "failed" | "disabled";

export function emailConfig() {
  return {
    enabled: Boolean(process.env.RESEND_API_KEY),
    from: process.env.EMAIL_FROM || "GSOL <poruchki@gsol.bg>",
  };
}

export async function sendEmail(
  to: string | string[],
  email: Email,
  options: { replyTo?: string; idempotencyKey?: string } = {},
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[имейл] не е изпратен (няма RESEND_API_KEY): ${email.subject}`);
    return "disabled";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: emailConfig().from,
        to: Array.isArray(to) ? to : [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[имейл] грешка ${res.status}: ${email.subject}`, await res.text().catch(() => ""));
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error(`[имейл] грешка: ${email.subject}`, error);
    return "failed";
  }
}
