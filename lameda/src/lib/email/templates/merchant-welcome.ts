/**
 * Welcome email sent to merchants immediately after successful registration.
 *
 * Contains:
 * - API key (sensitive — only sent here and shown once on screen)
 * - Telegram bot deep link (pre-fills /start command with their API key)
 * - CRM portal link for order management
 *
 * Returns a plain-text + HTML pair so Resend renders well across all clients.
 */

interface WelcomeEmailParams {
  ownerName: string
  businessName: string
  botName: string
  apiKey: string
  appUrl: string
}

export function buildMerchantWelcomeEmail(params: WelcomeEmailParams): {
  subject: string
  html: string
  text: string
} {
  const { ownerName, businessName, botName, apiKey, appUrl } = params

  const telegramLink = `https://t.me/${botName}?start=${apiKey}`
  const crmLink = `${appUrl}/login`
  const firstName = ownerName.split(' ')[0]

  const subject = `Your Lameda bot is live — save your API key`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .header { background: #18181b; padding: 28px 32px; }
    .header h1 { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { color: #a1a1aa; font-size: 13px; margin-top: 4px; }
    .body { padding: 32px; }
    .greeting { font-size: 15px; color: #3f3f46; line-height: 1.6; margin-bottom: 24px; }
    .section-label { font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }
    .key-box { background: #18181b; color: #4ade80; font-family: 'Courier New', monospace; font-size: 13px; padding: 12px 16px; border-radius: 8px; word-break: break-all; margin-bottom: 24px; }
    .warning { background: #fef9c3; border-left: 3px solid #ca8a04; padding: 10px 14px; border-radius: 0 6px 6px 0; font-size: 13px; color: #713f12; margin-bottom: 28px; }
    .cta-group { display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; }
    .btn { display: block; text-align: center; padding: 13px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; }
    .btn-primary { background: #18181b; color: #fff; }
    .btn-secondary { background: #f4f4f5; color: #18181b; border: 1px solid #e4e4e7; }
    .divider { border: none; border-top: 1px solid #f4f4f5; margin: 24px 0; }
    .steps { font-size: 13px; color: #52525b; line-height: 1.8; }
    .steps li { margin-bottom: 4px; }
    .footer { padding: 20px 32px; background: #fafafa; border-top: 1px solid #f4f4f5; }
    .footer p { font-size: 12px; color: #a1a1aa; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Lameda</h1>
      <p>${businessName} · Bot registration confirmed</p>
    </div>
    <div class="body">
      <p class="greeting">
        Hi ${firstName},<br/><br/>
        Your Telegram bot <strong>@${botName}</strong> is connected and ready to take orders.
        Keep this email — it contains your API key which you'll need to manage your account.
      </p>

      <p class="section-label">Your API Key — save this securely</p>
      <div class="key-box">${apiKey}</div>
      <div class="warning">
        ⚠️ This key was shown once on screen and will not be displayed again. Store it somewhere safe (password manager or notes). If you lose it, contact support to rotate it.
      </div>

      <div class="cta-group">
        <a href="${telegramLink}" class="btn btn-primary">
          📲 Open your bot on Telegram
        </a>
        <a href="${crmLink}" class="btn btn-secondary">
          📊 Go to your merchant dashboard
        </a>
      </div>

      <hr class="divider" />

      <p class="section-label">Next steps</p>
      <ol class="steps">
        <li><strong>Import your products</strong> — upload a catalogue CSV using your API key</li>
        <li><strong>Test your bot</strong> — click the Telegram button above and send a message</li>
        <li><strong>Share your bot link</strong> — send <strong>t.me/${botName}</strong> to your customers</li>
        <li><strong>Manage orders</strong> — log in to your merchant dashboard to view orders and customers</li>
      </ol>
    </div>
    <div class="footer">
      <p>
        You're receiving this because you registered <strong>${businessName}</strong> on Lameda.<br/>
        Questions? Reply to this email or contact <a href="mailto:hello@lameda.ng">hello@lameda.ng</a>
      </p>
    </div>
  </div>
</body>
</html>
`

  const text = `
Hi ${firstName},

Your Telegram bot @${botName} is connected and ready to take orders.

--- YOUR API KEY (save this) ---
${apiKey}
--------------------------------

⚠️ This key was shown once on screen and will not be displayed again. Store it in a password manager or safe notes app.

OPEN YOUR BOT ON TELEGRAM:
${telegramLink}

YOUR MERCHANT DASHBOARD:
${crmLink}

NEXT STEPS:
1. Import your products — upload a catalogue CSV using your API key
2. Test your bot — open the link above and send a message
3. Share t.me/${botName} with your customers
4. Manage orders at your merchant dashboard

---
Lameda · hello@lameda.ng
You're receiving this because you registered ${businessName} on Lameda.
`.trim()

  return { subject, html, text }
}
