import nodemailer from "nodemailer";

function hasSMTP(){
  return !!process.env.SMTP_HOST;
}

let cachedTransport = null;
function getTransport(){
  if (!hasSMTP()) return null;
  if (cachedTransport) return cachedTransport;
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return cachedTransport;
}

export async function sendEmail({ to, subject, text }) {
  if (!to) return;
  const tr = getTransport();
  if (!tr) {
    console.log("[EMAIL:DEV]", { to, subject, text });
    return;
  }
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@roboticsleb.local";
  await tr.sendMail({ from, to, subject, text });
}

// SMS placeholder: logs unless you wire a provider (Twilio, etc.)
export async function sendSMS({ to, text }) {
  if (!to) return;
  // Implement your SMS provider here. For now we log so you still get a trace.
  console.log("[SMS:DEV]", { to, text });
}
