import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let transporter: Transporter | null = null;

const isPlaceholderEmailConfig = (): boolean =>
  env.EMAIL_USER === 'your_email' || env.EMAIL_PASS === 'your_app_password';

const getTransporter = (): Transporter => {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_PORT === 465,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS
    }
  });

  return transporter;
};

export const sendOtpEmail = async (email: string, otp: string, subject: string): Promise<void> => {
  if (env.NODE_ENV === 'test') {
    return;
  }

  if (env.NODE_ENV === 'development' && isPlaceholderEmailConfig()) {
    console.log(`[DEV OTP] ${subject} for ${email}: ${otp}`);
    return;
  }

  await getTransporter().sendMail({
    from: `"PayFlow" <${env.EMAIL_USER}>`,
    to: email,
    subject,
    text: `Your PayFlow OTP is ${otp}. It expires in 5 minutes.`,
    html: `<p>Your PayFlow OTP is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`
  });
};
