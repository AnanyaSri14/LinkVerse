import nodemailer from "nodemailer";

const buildTransportOptions = () => {
  const smtpService = process.env.SMTP_SERVICE;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    return null;
  }

  if (smtpService) {
    return {
      service: smtpService,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    };
  }

  if (!smtpHost) {
    return null;
  }

  return {
    host: smtpHost,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  };
};

let transporterInstance = null;

const getTransporter = () => {
  const transportOptions = buildTransportOptions();

  if (!transportOptions) {
    return null;
  }

  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport(transportOptions);
  }

  return transporterInstance;
};

export const isEmailDeliveryConfigured = () => {
  return Boolean(getTransporter() && process.env.MAIL_FROM);
};

export const sendPasswordResetOtpEmail = async ({ to, name, otp }) => {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM;

  if (!transporter || !from) {
    return false;
  }

  await transporter.sendMail({
    from,
    to,
    subject: "LinkVerse password reset OTP",
    text: [
      `Hello ${name || "there"},`,
      "",
      `Your LinkVerse password reset OTP is: ${otp}`,
      "This OTP will expire in 10 minutes.",
      "",
      "If you did not request this, you can safely ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #101828;">
        <h2 style="color: #0a66c2;">LinkVerse Password Reset</h2>
        <p>Hello ${name || "there"},</p>
        <p>Your password reset OTP is:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 14px 18px; background: #eef6ff; border-radius: 12px; width: fit-content; color: #0a66c2;">
          ${otp}
        </div>
        <p style="margin-top: 16px;">This OTP will expire in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  });

  return true;
};
