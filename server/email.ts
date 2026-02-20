import nodemailer from "nodemailer";
import { google } from "googleapis";

const GMAIL_ADDRESS = "chronicstudios2021@gmail.com";
const DISPLAY_NAME = "HiFitComp";

let cachedTransporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (cachedTransporter) return cachedTransporter;

  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail OAuth credentials not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, "https://developers.google.com/oauthplayground");
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { token } = await oauth2Client.getAccessToken();
  if (!token) throw new Error("Failed to get Gmail access token");

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: GMAIL_ADDRESS,
      clientId,
      clientSecret,
      refreshToken,
      accessToken: token,
    },
  });

  return cachedTransporter;
}

function resetTransporter() {
  cachedTransporter = null;
}

const brandStyles = `
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #111; color: #fff; margin: 0; padding: 0; }
    .email-container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #FF5A09, #F59E0B); padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: bold; color: #fff; letter-spacing: 2px; text-transform: uppercase; }
    .content { padding: 32px 24px; }
    .content h2 { color: #FF5A09; margin-top: 0; }
    .content p { color: #ccc; line-height: 1.6; font-size: 15px; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #FF5A09, #F59E0B); color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; letter-spacing: 1px; text-transform: uppercase; margin: 16px 0; }
    .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #333; }
    .footer p { color: #666; font-size: 12px; margin: 4px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333; }
    .detail-label { color: #999; font-size: 14px; }
    .detail-value { color: #fff; font-size: 14px; font-weight: 600; }
    table.receipt { width: 100%; border-collapse: collapse; margin: 16px 0; }
    table.receipt td { padding: 10px 0; color: #ccc; font-size: 14px; border-bottom: 1px solid #333; }
    table.receipt td.label { color: #999; }
    table.receipt td.value { text-align: right; color: #fff; font-weight: 600; }
    table.receipt tr.total td { border-top: 2px solid #FF5A09; border-bottom: none; color: #FF5A09; font-size: 16px; font-weight: bold; }
  </style>
`;

function wrapInTemplate(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${brandStyles}
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>HiFitComp</h1>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>HiFitComp - Hawaii's Live Talent Competition Platform</p>
      <p>&copy; ${new Date().getFullYear()} HiFitComp. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendInviteEmail(opts: {
  to: string;
  inviterName: string;
  inviteToken: string;
  role: string;
  siteUrl: string;
}): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    const joinUrl = `${opts.siteUrl}/join?invite=${opts.inviteToken}`;
    const roleDisplay = opts.role.charAt(0).toUpperCase() + opts.role.slice(1);

    const html = wrapInTemplate(`
      <h2>You've Been Invited!</h2>
      <p><strong>${opts.inviterName}</strong> has invited you to join HiFitComp as a <strong>${roleDisplay}</strong>.</p>
      <p>HiFitComp is Hawaii's premier live talent competition platform where artists, models, bodybuilders, and performers compete for public votes.</p>
      <p style="text-align: center;">
        <a href="${joinUrl}" class="btn">Accept Invitation</a>
      </p>
      <p style="font-size: 13px; color: #888;">Or copy and paste this link into your browser:<br/>
        <span style="color: #FF5A09; word-break: break-all;">${joinUrl}</span>
      </p>
    `);

    await transporter.sendMail({
      from: `"${DISPLAY_NAME}" <${GMAIL_ADDRESS}>`,
      to: opts.to,
      subject: `${opts.inviterName} invited you to join HiFitComp!`,
      html,
    });

    console.log(`Invite email sent to ${opts.to}`);
    return true;
  } catch (err: any) {
    console.error("Failed to send invite email:", err.message);
    resetTransporter();
    return false;
  }
}

export async function sendPurchaseReceipt(opts: {
  to: string;
  buyerName: string;
  items: { description: string; amount: string }[];
  total: string;
  tax?: string;
  transactionId: string;
  competitionName?: string;
  contestantName?: string;
}): Promise<boolean> {
  try {
    const transporter = await getTransporter();

    let itemsHtml = opts.items.map(item => `
      <tr>
        <td class="label">${item.description}</td>
        <td class="value">${item.amount}</td>
      </tr>
    `).join("");

    if (opts.tax) {
      itemsHtml += `
        <tr>
          <td class="label">Sales Tax</td>
          <td class="value">${opts.tax}</td>
        </tr>
      `;
    }

    itemsHtml += `
      <tr class="total">
        <td>Total</td>
        <td style="text-align: right;">${opts.total}</td>
      </tr>
    `;

    const contextLine = opts.competitionName
      ? `<p>Competition: <strong>${opts.competitionName}</strong>${opts.contestantName ? ` | Contestant: <strong>${opts.contestantName}</strong>` : ""}</p>`
      : "";

    const html = wrapInTemplate(`
      <h2>Purchase Receipt</h2>
      <p>Hi <strong>${opts.buyerName}</strong>, thank you for your purchase!</p>
      ${contextLine}
      <table class="receipt">
        ${itemsHtml}
      </table>
      <p style="font-size: 13px; color: #888;">Transaction ID: ${opts.transactionId}</p>
      <p style="font-size: 13px; color: #888;">Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      <p>If you have questions about this purchase, please contact us.</p>
    `);

    await transporter.sendMail({
      from: `"${DISPLAY_NAME}" <${GMAIL_ADDRESS}>`,
      to: opts.to,
      subject: `Your HiFitComp Purchase Receipt`,
      html,
    });

    console.log(`Receipt email sent to ${opts.to}`);
    return true;
  } catch (err: any) {
    console.error("Failed to send receipt email:", err.message);
    resetTransporter();
    return false;
  }
}

export function getGmailAuthUrl(redirectUri: string): string {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not set");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://mail.google.com/"],
    prompt: "consent",
  });
}

export async function exchangeGmailCode(code: string, redirectUri: string): Promise<string> {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not set");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) throw new Error("No refresh token received. Make sure you revoke access and try again.");
  return tokens.refresh_token;
}

export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    const html = wrapInTemplate(`
      <h2>Test Email Successful!</h2>
      <p>This is a test email from <strong>HiFitComp</strong>.</p>
      <p>If you're reading this, your email system is working correctly.</p>
      <p style="color: #FF5A09; font-weight: bold;">All systems go!</p>
    `);

    await transporter.sendMail({
      from: `"${DISPLAY_NAME}" <${GMAIL_ADDRESS}>`,
      to,
      subject: "HiFitComp - Test Email",
      html,
    });

    console.log(`Test email sent to ${to}`);
    return true;
  } catch (err: any) {
    console.error("Failed to send test email:", err.message);
    resetTransporter();
    throw err;
  }
}

export function isEmailConfigured(): boolean {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  return !!(clientId && clientSecret && process.env.GMAIL_REFRESH_TOKEN);
}
