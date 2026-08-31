import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendVerificationEmail(to: string, name: string | null, token: string, origin: string): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping verification email");
    return;
  }
  const verifyUrl = `${origin}/verify-email?token=${token}`;
  try {
    await resend.emails.send({
      from: "TRASHit <noreply@trashit.bg>",
      to,
      subject: "Потвърдете имейла си — TRASHit",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Добре дошли в TRASHit${name ? `, ${name}` : ""}!</h2>
          <p>Моля, потвърдете имейл адреса си, за да активирате акаунта си.</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; margin: 16px 0;">Потвърди имейла</a>
          <p style="color: #666; font-size: 13px;">Ако бутонът не работи, копирайте този линк: <br>${verifyUrl}</p>
          <p style="color: #999; font-size: 12px;">Линкът е валиден 24 часа.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] Failed to send verification email:", err);
  }
}