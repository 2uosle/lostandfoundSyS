import nodemailer from 'nodemailer';

export type MailOptions = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });
  return transporter;
}

export async function sendEmail({ to, subject, html, text }: MailOptions): Promise<{ sent: boolean; info?: any; reason?: string }>{
  const from = process.env.SMTP_FROM || 'no-reply@localhost';
  const tx = getTransporter();

  if (!tx) {
    // Fallback: log to server console
    console.warn('[email] SMTP not configured. Skipping send.', { to, subject });
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const info = await tx.sendMail({ from, to, subject, html, text });
    return { sent: true, info };
  } catch (err) {
    console.error('[email] Failed to send', err);
    return { sent: false, reason: (err as Error).message };
  }
}
