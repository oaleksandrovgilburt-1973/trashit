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
export async function sendEntranceAccessRequestEmail(to: string, district: string, blok: string, vhod: string): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping entrance access email");
    return;
  }
  try {
    await resend.emails.send({
      from: "TRASHit <noreply@trashit.bg>",
      to,
      subject: "Молба за достъп до вход / Entrance access request — TRASHit",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <p>Здравейте,</p>
          <p>Благодарим Ви за проявения интерес към услугата на TRASHit.</p>
          <p>За да можем да събираме отпадъците от посочения от Вас адрес (<strong>${district}, Бл. ${blok}, Вх. ${vhod}</strong>), е необходимо да осигурим достъп за нашия екип. Това може да бъде чип за входната врата, ключ, код за достъп или друг подходящ начин според организацията на сградата.</p>
          <p>Моля да ни уведомите кой вариант е възможен и как можем да получим необходимото средство за достъп.</p>
          <p>Предоставеният достъп ще бъде използван единствено за извършване на заявената услуга.</p>
          <p>Благодарим Ви за съдействието!</p>

          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

          <p>Hello,</p>
          <p>Thank you for your interest in TRASHit's service.</p>
          <p>In order to collect waste from the address you provided (<strong>${district}, Bl. ${blok}, Entr. ${vhod}</strong>), our team needs access to the entrance. This could be a door chip, key, access code, or another arrangement suitable for your building.</p>
          <p>Please let us know which option is available and how we can obtain the necessary access.</p>
          <p>The access provided will be used solely to carry out the requested service.</p>
          <p>Thank you for your cooperation!</p>

          <p style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            📞 0888 418 024 &nbsp;·&nbsp; 🌐 <a href="https://trashit.bg" style="color: #16a34a;">trashit.bg</a>
          </p>
          <p style="margin-top: 16px;">С уважение / Best regards,<br>Екипът на TRASHit / The TRASHit Team</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] Failed to send entrance access request email:", err);
  }
}