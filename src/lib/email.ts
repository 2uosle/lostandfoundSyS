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
  const emailAddress = process.env.SMTP_FROM || 'no-reply@localhost';
  const from = `ClaimNEU Lost and Found <${emailAddress}>`;
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

export interface MatchNotificationData {
  userEmail: string;
  userName: string;
  lostItemTitle: string;
  lostItemDescription: string;
  foundItemTitle: string;
  foundItemDescription: string;
  matchScore: number;
  dashboardUrl: string;
}

/**
 * Send email notification when a potential match is found
 */
export async function sendMatchNotification(data: MatchNotificationData) {
  const {
    userEmail,
    userName,
    lostItemTitle,
    lostItemDescription,
    foundItemTitle,
    foundItemDescription,
    matchScore,
    dashboardUrl,
  } = data;

  const subject = `🎉 Potential Match Found for Your Lost Item: ${lostItemTitle}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f3f4f6;
        }
        .container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px;
        }
        .match-score {
          background: #10b981;
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          display: inline-block;
          font-weight: bold;
          margin: 10px 0 20px 0;
        }
        .item-card {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #667eea;
        }
        .item-title {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 10px;
        }
        .item-description {
          color: #6b7280;
          margin: 0;
        }
        .cta-button {
          display: inline-block;
          background: #667eea;
          color: white !important;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          margin: 20px 0;
        }
        .steps {
          background: #eff6ff;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .steps h3 {
          margin-top: 0;
          color: #1e40af;
        }
        .footer {
          text-align: center;
          color: #9ca3af;
          font-size: 14px;
          padding: 20px;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Great News, ${userName}!</h1>
          <p style="margin: 10px 0 0 0;">We found a potential match for your lost item</p>
        </div>
        
        <div class="content">
          <div style="text-align: center;">
            <div class="match-score">
              ${matchScore}% Match Confidence
            </div>
          </div>
          
          <h2 style="color: #1f2937; margin-top: 25px;">Your Lost Item:</h2>
          <div class="item-card">
            <div class="item-title">📢 ${lostItemTitle}</div>
            <p class="item-description">${lostItemDescription}</p>
          </div>
          
          <h2 style="color: #1f2937;">Found Item Match:</h2>
          <div class="item-card">
            <div class="item-title">✨ ${foundItemTitle}</div>
            <p class="item-description">${foundItemDescription}</p>
          </div>
          
          <p style="margin-top: 25px; color: #4b5563;">
            Our system identified this as a potential match based on the description, category, location, and other factors.
          </p>
          
          <center>
            <a href="${dashboardUrl}" class="cta-button">
              View in Dashboard →
            </a>
          </center>
          
          <div class="steps">
            <h3>📋 Next Steps:</h3>
            <ol style="margin: 10px 0; padding-left: 20px; color: #374151;">
              <li><strong>Come to the OSAS Office (Bring your ID)</strong></li>
              <li>Contact the admin to verify this match</li>
              <li>Prepare to verify ownership</li>
            </ol>
          </div>
        </div>
        
        <div class="footer">
          <p>
            This is an automated notification from the ClaimNEU Lost and Found System.<br>
            If you did not report this item, please ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Great News, ${userName}!

We found a potential match for your lost item.

Match Confidence: ${matchScore}%

Your Lost Item:
${lostItemTitle}
${lostItemDescription}

Found Item Match:
${foundItemTitle}
${foundItemDescription}

View in dashboard: ${dashboardUrl}

Next Steps:
1. Come to the OSAS Office (Bring your ID)
2. Contact the admin to verify this match
3. Prepare to verify ownership

---
This is an automated notification from the ClaimNEU Lost and Found System.
If you did not report this item, please ignore this email.
  `.trim();

  return sendEmail({
    to: userEmail,
    subject,
    html,
    text,
  });
}
