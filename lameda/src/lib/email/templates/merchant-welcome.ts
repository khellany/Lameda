interface WelcomeEmailParams {
  ownerName: string
  businessName: string
  botName: string
  apiKey: string
  tempPassword: string
  loginEmail: string
  appUrl: string
}

export function buildMerchantWelcomeEmail(params: WelcomeEmailParams): {
  subject: string
  html: string
  text: string
} {
  const { ownerName, businessName, botName, apiKey, tempPassword, loginEmail, appUrl } = params

  const telegramLink = `https://t.me/${botName}?start=${apiKey}`
  const crmLink = `${appUrl}/login`
  const firstName = ownerName.split(' ')[0]

  const subject = `${businessName} is live on Lameda — your login details inside`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; color: #18181b; }
    .wrapper { max-width: 580px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .header { background: #18181b; padding: 28px 32px; }
    .header h1 { color: #fff; font-size: 22px; font-weight: 700; }
    .header p { color: #a1a1aa; font-size: 13px; margin-top: 4px; }
    .body { padding: 32px; }
    .greeting { font-size: 15px; color: #3f3f46; line-height: 1.65; margin-bottom: 28px; }
    /* Credential cards */
    .creds { background: #f9fafb; border: 1px solid #e4e4e7; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .creds h2 { font-size: 12px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 14px; }
    .cred-row { display: flex; align-items: baseline; gap: 12px; margin-bottom: 10px; }
    .cred-row:last-child { margin-bottom: 0; }
    .cred-label { font-size: 12px; color: #71717a; width: 90px; flex-shrink: 0; }
    .cred-value { font-family: 'Courier New', monospace; font-size: 13px; color: #18181b; font-weight: 600; word-break: break-all; }
    .warning { background: #fef9c3; border-left: 3px solid #ca8a04; padding: 11px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: #713f12; line-height: 1.55; margin-bottom: 28px; }
    /* Buttons */
    .btn-group { margin-bottom: 32px; }
    .btn { display: block; text-align: center; padding: 13px 20px; border-radius: 9px; font-size: 14px; font-weight: 600; text-decoration: none; margin-bottom: 10px; }
    .btn-primary { background: #18181b; color: #ffffff; }
    .btn-secondary { background: #f4f4f5; color: #18181b; border: 1px solid #e4e4e7; }
    /* Steps */
    .steps-section { border-top: 1px solid #f4f4f5; padding-top: 24px; margin-bottom: 0; }
    .steps-section h2 { font-size: 14px; font-weight: 700; color: #18181b; margin-bottom: 16px; }
    .step { display: flex; gap: 14px; margin-bottom: 18px; }
    .step:last-child { margin-bottom: 0; }
    .step-num { width: 26px; height: 26px; border-radius: 50%; background: #18181b; color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .step-body { flex: 1; }
    .step-title { font-size: 13px; font-weight: 600; color: #18181b; margin-bottom: 3px; }
    .step-desc { font-size: 13px; color: #71717a; line-height: 1.55; }
    .step-desc a { color: #18181b; }
    .step-desc code { background: #f4f4f5; padding: 1px 5px; border-radius: 4px; font-size: 12px; font-family: 'Courier New', monospace; }
    /* Footer */
    .footer { padding: 20px 32px; background: #fafafa; border-top: 1px solid #f4f4f5; }
    .footer p { font-size: 12px; color: #a1a1aa; line-height: 1.6; }
    .footer a { color: #71717a; }
  </style>
</head>
<body>
  <div class="wrapper">

    <div class="header">
      <h1>Lameda</h1>
      <p>${businessName} · Your bot is live 🎉</p>
    </div>

    <div class="body">

      <p class="greeting">
        Hi ${firstName},<br/><br/>
        Your Telegram bot <strong>@${botName}</strong> is connected and ready to receive orders.
        Everything you need to get started is below — keep this email somewhere safe.
      </p>

      <!-- Login credentials -->
      <div class="creds">
        <h2>Your Merchant Dashboard Login</h2>
        <div class="cred-row">
          <span class="cred-label">Portal</span>
          <span class="cred-value"><a href="${crmLink}" style="color:#18181b">${crmLink}</a></span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Email</span>
          <span class="cred-value">${loginEmail}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Password</span>
          <span class="cred-value">${tempPassword}</span>
        </div>
      </div>

      <!-- API key -->
      <div class="creds">
        <h2>Your API Key (for product import)</h2>
        <div class="cred-row">
          <span class="cred-label">API Key</span>
          <span class="cred-value">${apiKey}</span>
        </div>
      </div>

      <div class="warning">
        ⚠️ <strong>Change your password</strong> when you first log in — this temporary password was sent by email. Your API key is unique to your account; do not share it.
      </div>

      <!-- CTAs -->
      <div class="btn-group">
        <a href="${crmLink}" class="btn btn-primary">📊 Log in to your dashboard</a>
        <a href="${telegramLink}" class="btn btn-secondary">📲 Open your bot on Telegram</a>
      </div>

      <!-- Step by step guide -->
      <div class="steps-section">
        <h2>Getting started — step by step</h2>

        <div class="step">
          <div class="step-num">1</div>
          <div class="step-body">
            <div class="step-title">Log in to your merchant dashboard</div>
            <div class="step-desc">
              Go to <a href="${crmLink}">${crmLink}</a> and sign in with your email and the temporary password above.
              Change your password on your first visit.
            </div>
          </div>
        </div>

        <div class="step">
          <div class="step-num">2</div>
          <div class="step-body">
            <div class="step-title">Import your product catalogue</div>
            <div class="step-desc">
              Prepare a CSV file with your products (name, price, description, stock quantity).
              Upload it from your dashboard or use the import API with your API key above.
              Your bot will immediately start showing these products to customers.
            </div>
          </div>
        </div>

        <div class="step">
          <div class="step-num">3</div>
          <div class="step-body">
            <div class="step-title">Connect your bot on Telegram</div>
            <div class="step-desc">
              Tap <strong>"Open your bot on Telegram"</strong> above — or search <code>@${botName}</code> on Telegram.
              Send any message to confirm it's working. Your bot will greet you and show your catalogue.
            </div>
          </div>
        </div>

        <div class="step">
          <div class="step-num">4</div>
          <div class="step-body">
            <div class="step-title">Set up your delivery zones</div>
            <div class="step-desc">
              From your dashboard, configure which areas you deliver to and your delivery fees.
              Customers will only see delivery options available in their location.
            </div>
          </div>
        </div>

        <div class="step">
          <div class="step-num">5</div>
          <div class="step-body">
            <div class="step-title">Share your bot link with customers</div>
            <div class="step-desc">
              Share <strong>t.me/${botName}</strong> on WhatsApp, Instagram, or your website.
              Customers tap the link, browse your catalogue, and place orders — all inside Telegram.
            </div>
          </div>
        </div>

        <div class="step">
          <div class="step-num">6</div>
          <div class="step-body">
            <div class="step-title">Track orders from your dashboard</div>
            <div class="step-desc">
              Every order placed through your bot appears in your merchant dashboard in real time.
              You can view order details, customer info, and update delivery status from there.
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="footer">
      <p>
        You're receiving this because you registered <strong>${businessName}</strong> on Lameda.<br/>
        Need help? Reply to this email or reach us at <a href="mailto:hello@lameda.ng">hello@lameda.ng</a>
      </p>
    </div>

  </div>
</body>
</html>
`

  const text = `
Hi ${firstName},

Your Telegram bot @${botName} is connected and ready to receive orders.

---
MERCHANT DASHBOARD LOGIN
Portal:   ${crmLink}
Email:    ${loginEmail}
Password: ${tempPassword}
---

---
API KEY (for product import)
${apiKey}
---

⚠️ Change your password when you first log in. Do not share your API key.

GETTING STARTED — STEP BY STEP:

1. LOG IN TO YOUR DASHBOARD
   Visit ${crmLink} and sign in with your email and temporary password above.
   Change your password on first login.

2. IMPORT YOUR PRODUCT CATALOGUE
   Prepare a CSV with your products (name, price, description, stock).
   Upload from your dashboard or use the import API with your API key.

3. CONNECT YOUR BOT ON TELEGRAM
   Open Telegram and search for @${botName}, or tap this link:
   ${telegramLink}
   Send a message to confirm your bot is working.

4. SET UP YOUR DELIVERY ZONES
   Configure delivery areas and fees from your dashboard.

5. SHARE YOUR BOT LINK WITH CUSTOMERS
   Share t.me/${botName} on WhatsApp, Instagram, or your website.
   Customers browse your catalogue and place orders inside Telegram.

6. TRACK ORDERS FROM YOUR DASHBOARD
   Every order appears in your merchant dashboard in real time.

---
Lameda · hello@lameda.ng
You're receiving this because you registered ${businessName} on Lameda.
`.trim()

  return { subject, html, text }
}
