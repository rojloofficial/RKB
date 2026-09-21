import nodemailer from "nodemailer";

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function cleanEnv(val?: string): string {
  return (val ?? "").trim().replace(/^['"]|['"]$/g, "");
}

export type EmailResult =
  | { sent: true }
  | { sent: false; reason: string; error?: string };

const FALLBACK_USER = "rojloofficial@gmail.com";
const FALLBACK_PASS = "svsgsykzenlxtpmw";

function createDirectTransporter(
  host: string,
  port: number,
  user: string,
  pass: string,
  secure: boolean
): nodemailer.Transporter {
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });
}

function sanitizeDestinationEmail(val: string): string {
  let s = String(val || "").trim().toLowerCase();
  s = s.replace(/@gmail\.ocm$/i, "@gmail.com");
  s = s.replace(/@gamil\.com$/i, "@gmail.com");
  s = s.replace(/@gmai\.com$/i, "@gmail.com");
  s = s.replace(/@gmial\.com$/i, "@gmail.com");
  s = s.replace(/@gmaill\.com$/i, "@gmail.com");
  s = s.replace(/@gmail\.co$/i, "@gmail.com");
  s = s.replace(/@yahoo\.ocm$/i, "@yahoo.com");
  s = s.replace(/@yaho\.com$/i, "@yahoo.com");
  s = s.replace(/@hotmail\.ocm$/i, "@hotmail.com");
  s = s.replace(/@hotmial\.com$/i, "@hotmail.com");
  s = s.replace(/\.ocm$/i, ".com");
  s = s.replace(/\.con$/i, ".com");
  s = s.replace(/\.cmo$/i, ".com");
  return s;
}

export async function sendEmail({ to, subject, text, html }: EmailPayload): Promise<EmailResult> {
  const cleanTo = sanitizeDestinationEmail(to);
  const host = cleanEnv(process.env.SMTP_HOST) || "smtp.gmail.com";
  const port = Number(cleanEnv(process.env.SMTP_PORT) || "465");
  const rawUser = cleanEnv(process.env.SMTP_USER);
  const rawPass = cleanEnv(process.env.SMTP_PASS).replace(/\s+/g, "");

  // Safe fallback to verified official Gmail credentials so emails always deliver
  const user = (rawUser && rawUser !== "suraj@gmail.com") ? rawUser : FALLBACK_USER;
  const pass = (rawPass && rawPass !== "vanni12") ? rawPass : FALLBACK_PASS;

  const siteName = cleanEnv(process.env.NEXT_PUBLIC_SITE_NAME) || "RKB";
  const customFrom = cleanEnv(process.env.SMTP_FROM);
  const from = customFrom || `"${siteName}" <${user}>`;

  if (!host || !user || !pass) {
    console.warn("[email] SMTP credentials not configured. Email skipped for:", cleanTo);
    return {
      sent: false,
      reason: "missing-smtp-config",
      error: "SMTP credentials are not configured on the server.",
    };
  }

  // Attempt 1: Send using primary configuration
  try {
    const isPort465 = port === 465;
    const transporter = createDirectTransporter(host, port, user, pass, isPort465);
    await transporter.sendMail({
      from,
      to: cleanTo,
      replyTo: user,
      subject,
      text,
      html: html ?? text,
    });

    console.log(`[email] Email sent successfully to ${cleanTo} via ${host}:${port}`);
    return { sent: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[email] Attempt 1 with primary credentials (${user} on ${host}:${port}) failed for ${cleanTo}:`, errMsg);

    // Attempt 2: Fallback to verified official Gmail credentials on port 465
    if (user !== FALLBACK_USER || pass !== FALLBACK_PASS || host !== "smtp.gmail.com" || port !== 465) {
      console.warn("[email] Retrying email delivery with official verified Gmail credentials (port 465)...");
      try {
        const fallbackTransporter = createDirectTransporter("smtp.gmail.com", 465, FALLBACK_USER, FALLBACK_PASS, true);
        await fallbackTransporter.sendMail({
          from: `"${siteName}" <${FALLBACK_USER}>`,
          to: cleanTo,
          replyTo: FALLBACK_USER,
          subject,
          text,
          html: html ?? text,
        });

        console.log(`[email] Email delivered successfully to ${cleanTo} using verified Gmail credentials (port 465)`);
        return { sent: true };
      } catch (fallbackError: unknown) {
        const fbErrMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        console.error("[email] Attempt 2 on port 465 failed:", fbErrMsg);
      }
    }

    // Attempt 3: Alternative port 587 (STARTTLS) with verified credentials (bypasses ISP port 465 blocking)
    console.warn("[email] Attempting delivery via Gmail port 587 (STARTTLS)...");
    try {
      const port587Transporter = createDirectTransporter("smtp.gmail.com", 587, FALLBACK_USER, FALLBACK_PASS, false);
      await port587Transporter.sendMail({
        from: `"${siteName}" <${FALLBACK_USER}>`,
        to: cleanTo,
        replyTo: FALLBACK_USER,
        subject,
        text,
        html: html ?? text,
      });

      console.log(`[email] Email delivered successfully to ${cleanTo} via port 587 STARTTLS`);
      return { sent: true };
    } catch (err587: unknown) {
      const err587Msg = err587 instanceof Error ? err587.message : String(err587);
      console.error("[email] Attempt 3 on port 587 also failed:", err587Msg);
      return {
        sent: false,
        reason: "delivery-failed",
        error: `Email delivery failed: ${err587Msg || errMsg}`,
      };
    }
  }
}

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "RKB";

/**
 * Send an email verification OTP to the user, using the site's branding.
 * Formatted specifically for primary inbox delivery without spam flags.
 */
export function sendOtpEmail({
  to,
  otp,
  expiresInMinutes = 10,
}: {
  to: string;
  otp: string;
  expiresInMinutes?: number;
}) {
  const siteName = cleanEnv(process.env.NEXT_PUBLIC_SITE_NAME) || SITE_NAME;
  const subject = `${otp} is your ${siteName} verification code`;
  const text = [
    `Your ${siteName} verification code is:`,
    ``,
    otp,
    ``,
    `This code expires in ${expiresInMinutes} minutes.`,
    ``,
    `If you did not request this code, you can safely ignore this email.`,
    ``,
    `— ${siteName} Team`,
  ].join("\n");

  const html = [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${otp} is your verification code</title></head>`,
    `<body style="margin:0;padding:24px 12px;background-color:#fff1f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">`,
    `<!-- Preheader text visible in email previews / push notifications -->`,
    `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">`,
    `${otp} is your ${siteName} verification code. Valid for ${expiresInMinutes} minutes.`,
    `</div>`,
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">`,
    `<tr><td align="center">`,
    `<table role="presentation" style="max-width:480px;width:100%;background:#ffffff;border:1px solid #fecdd3;border-radius:24px;padding:32px 24px;box-shadow:0 4px 12px rgba(244,63,94,0.06);" border="0" cellpadding="0" cellspacing="0">`,
    `<tr><td style="text-align:center;">`,
    `<h1 style="color:#881337;font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">${siteName}</h1>`,
    `<p style="color:#4c0519;font-size:16px;line-height:24px;margin:0 0 20px;">Use the verification code below to verify your email address and continue.</p>`,
    `<div style="background:#fff1f2;border:2px dashed #fb7185;border-radius:16px;padding:18px;margin:0 auto 20px;text-align:center;">`,
    `<span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#e11d48;font-family:monospace;display:inline-block;padding-left:10px;">${otp}</span>`,
    `</div>`,
    `<p style="color:#881337;font-size:14px;line-height:20px;margin:0 0 8px;">Valid for <strong>${expiresInMinutes} minutes</strong>. Please do not share this code.</p>`,
    `<p style="color:#9f1239;font-size:13px;line-height:18px;margin:0;">If you didn't request this code, you can safely ignore this email.</p>`,
    `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #ffe4e6;font-size:12px;color:#9ca3af;text-align:center;">`,
    `This is an automated security verification message from ${siteName}.`,
    `</div>`,
    `</td></tr>`,
    `</table>`,
    `</td></tr>`,
    `</table>`,
    `</body>`,
    `</html>`,
  ].join("");

  return sendEmail({ to, subject, text, html });
}

export function sendVipInviteEmail({
  to,
  areaLabel,
  phone,
  loginUrl,
  expiresAt,
}: {
  to: string;
  areaLabel: string;
  phone: string;
  loginUrl?: string;
  expiresAt: Date | string;
}) {
  const siteName = cleanEnv(process.env.NEXT_PUBLIC_SITE_NAME) || SITE_NAME;
  const expiryFormatted = new Date(expiresAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const subject = `VIP Access Granted for ${areaLabel} - Your Login Details`;

  const envVipUrl = cleanEnv(process.env.VIP_LOGIN_URL || process.env.NEXT_PUBLIC_VIP_URL);
  const effectiveLoginUrl =
    envVipUrl || (loginUrl ? cleanEnv(loginUrl) : "") || "https://rojloo.vercel.app/vip/login";

  const text = [
    `Hello,`,
    ``,
    `You have been granted VIP Control Panel access for: ${areaLabel}.`,
    `Your access is valid until: ${expiryFormatted}.`,
    ``,
    `----------------------------------------`,
    `YOUR VIP LOGIN DETAILS:`,
    `----------------------------------------`,
    `• Email: ${to}`,
    `• Password: ${phone}`,
    `• VIP Page URL: ${effectiveLoginUrl}`,
    `----------------------------------------`,
    ``,
    `Log in to your VIP Control Panel at:`,
    effectiveLoginUrl,
    ``,
    `Please contact the admin team if you need any assistance.`,
    ``,
    `— ${siteName} Team`,
  ].join("\n");

  const html = [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>VIP Access Granted</title></head>`,
    `<body style="margin:0;padding:24px 12px;background-color:#fff1f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">`,
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">`,
    `<tr><td align="center">`,
    `<table role="presentation" style="max-width:520px;width:100%;background:#ffffff;border:1px solid #fecdd3;border-radius:24px;padding:36px 24px;box-shadow:0 4px 12px rgba(244,63,94,0.06);" border="0" cellpadding="0" cellspacing="0">`,
    `<tr><td style="text-align:center;">`,
    `<h1 style="color:#881337;font-size:24px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">${siteName} VIP Portal</h1>`,
    `<p style="color:#4c0519;font-size:15px;line-height:22px;margin:0 0 20px;">You have been assigned VIP access control for:</p>`,
    `<div style="background:#fff1f2;border:2px solid #fb7185;border-radius:16px;padding:16px;margin:0 auto 20px;text-align:center;">`,
    `<span style="font-size:20px;font-weight:800;color:#9f1239;display:block;">${areaLabel}</span>`,
    `<span style="font-size:12px;color:#e11d48;font-weight:600;display:block;margin-top:4px;">Valid until ${expiryFormatted}</span>`,
    `</div>`,
    `<div style="background:#fef2f2;border:1.5px solid #f87171;border-radius:14px;padding:18px 20px;margin:0 auto 24px;text-align:left;">`,
    `<h3 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #fecaca;padding-bottom:8px;">Your VIP Login Details</h3>`,
    `<p style="margin:6px 0;font-size:13px;color:#450a0a;"><strong>Email:</strong> <span style="font-family:monospace;font-size:14px;color:#1e1e1e;font-weight:600;">${to}</span></p>`,
    `<p style="margin:6px 0;font-size:13px;color:#450a0a;"><strong>Password:</strong> <span style="font-family:monospace;font-size:14px;color:#991b1b;font-weight:700;">${phone}</span></p>`,
    `<p style="margin:6px 0;font-size:13px;color:#450a0a;"><strong>VIP Page URL:</strong> <a href="${effectiveLoginUrl}" style="font-family:monospace;font-size:13px;color:#be123c;font-weight:600;word-break:break-all;">${effectiveLoginUrl}</a></p>`,
    `</div>`,
    `<div style="margin:24px 0;">`,
    `<a href="${effectiveLoginUrl}" style="background-color:#450a0a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:14px;font-weight:700;font-size:15px;display:inline-block;box-shadow:0 4px 10px rgba(69,10,10,0.25);">Login to VIP Panel &rarr;</a>`,
    `</div>`,
    `<p style="color:#881337;font-size:13px;line-height:20px;margin:20px 0 8px;">Or copy and paste this link in your browser:</p>`,
    `<p style="margin:0 0 20px;"><a href="${effectiveLoginUrl}" style="color:#be123c;font-weight:600;font-size:13px;word-break:break-all;">${effectiveLoginUrl}</a></p>`,
    `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #ffe4e6;font-size:12px;color:#9ca3af;text-align:center;">`,
    `This is an automated VIP notification from ${siteName}. If you were not expecting this, please contact support.`,
    `</div>`,
    `</td></tr>`,
    `</table>`,
    `</td></tr>`,
    `</table>`,
    `</body>`,
    `</html>`,
  ].join("");

  return sendEmail({ to, subject, text, html });
}

