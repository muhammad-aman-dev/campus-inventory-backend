import nodemailer from "nodemailer";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const createTransporter = () => {
  const port = Number(process.env.SMTP_PORT) || 587;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
};

const buildLayout = ({ heading, intro, buttonLabel, link, footer }) => `
  <div style="font-family: Arial, sans-serif; background:#f1f5f9; padding:24px;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px;">
      <h2 style="margin:0 0 16px; color:#1e293b;">${heading}</h2>
      <p style="color:#475569; line-height:1.6;">${intro}</p>
      <p style="margin:28px 0;">
        <a href="${link}" style="background:#2563eb; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">
          ${buttonLabel}
        </a>
      </p>
      <p style="color:#64748b; font-size:13px; line-height:1.6;">
        If the button does not work, copy this link into your browser:<br />
        <a href="${link}" style="color:#2563eb; word-break:break-all;">${link}</a>
      </p>
      <p style="color:#94a3b8; font-size:12px;">${footer}</p>
    </div>
  </div>
`;

export const sendVerificationEmail = async (user, rawToken) => {
  const link = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your email address",
    text: `Hello ${user.name}, verify your email by opening this link (valid for 24 hours): ${link}`,
    html: buildLayout({
      heading: "Verify your email",
      intro: `Hello ${escapeHtml(user.name)}, thanks for registering. Please confirm your email address to activate your account. This link is valid for 24 hours.`,
      buttonLabel: "Verify Email",
      link,
      footer: "If you did not create this account, you can ignore this email.",
    }),
  });
};

export const sendPasswordResetEmail = async (user, rawToken) => {
  const link = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    text: `Hello ${user.name}, reset your password using this link (valid for 1 hour): ${link}`,
    html: buildLayout({
      heading: "Reset your password",
      intro: `Hello ${escapeHtml(user.name)}, we received a request to reset your password. This link is valid for 1 hour.`,
      buttonLabel: "Reset Password",
      link,
      footer: "If you did not request this, you can safely ignore this email.",
    }),
  });
};