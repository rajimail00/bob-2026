import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD
    ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
    : null;

export async function sendVerificationEmail(to: string, code: string, locale: string): Promise<void> {
  const subject = SUBJECT_BY_LOCALE[locale] ?? SUBJECT_BY_LOCALE.en;
  const text = `${code}`;

  if (!transporter) {
    // No SMTP configured (local dev) — log instead of sending, never swallow the code silently.
    console.log(`[mailer] verification code for ${to}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text: `${text}\n\n${BODY_BY_LOCALE[locale] ?? BODY_BY_LOCALE.en}`,
  });
}

const SUBJECT_BY_LOCALE: Record<string, string> = {
  en: "Your BOB verification code",
  de: "Dein BOB-Bestätigungscode",
  es: "Tu código de verificación de BOB",
  fr: "Votre code de vérification BOB",
};

const BODY_BY_LOCALE: Record<string, string> = {
  en: "Enter this code in the app to verify your email. It expires in 15 minutes.",
  de: "Gib diesen Code in der App ein, um deine E-Mail-Adresse zu bestätigen. Er läuft in 15 Minuten ab.",
  es: "Introduce este código en la app para verificar tu correo electrónico. Caduca en 15 minutos.",
  fr: "Saisissez ce code dans l’application pour vérifier votre adresse e-mail. Il expire dans 15 minutes.",
};
