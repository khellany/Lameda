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

  const subject = `${businessName} is live on Lameda. Your login details are inside`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      background: #f3f4f8;
      color: #1e1b4b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 580px;
      margin: 32px auto;
      background: #ffffff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(30,27,75,0.10);
    }

    /* Header */
    .header {
      background: #1e1b4b;
      padding: 28px 36px 24px;
    }
    .logo-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .logo-mark {
      width: 32px;
      height: 32px;
      background: #a3e635;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
      font-weight: 800;
      font-size: 14px;
      color: #1e1b4b;
      line-height: 1;
      vertical-align: middle;
    }
    .logo-text {
      font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
      font-weight: 700;
      font-size: 18px;
      color: #ffffff;
      vertical-align: middle;
    }
    .header-title {
      font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.25;
      margin-bottom: 6px;
    }
    .header-sub {
      font-size: 14px;
      color: #a5b4fc;
      line-height: 1.5;
    }

    /* Body */
    .body { padding: 36px; }
    .greeting {
      font-size: 15px;
      color: #374151;
      line-height: 1.7;
      margin-bottom: 28px;
    }
    .greeting strong { color: #1e1b4b; }

    /* Section label */
    .section-label {
      font-size: 11px;
      font-weight: 700;
      color: #a3e635;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 10px;
      display: block;
    }

    /* Credential cards */
    .creds {
      background: #f8f7ff;
      border: 1px solid #e0e7ff;
      border-radius: 10px;
      padding: 20px 22px;
      margin-bottom: 16px;
    }
    .creds-title {
      font-size: 11px;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 14px;
    }
    .cred-row {
      display: flex;
      align-items: baseline;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #e0e7ff;
    }
    .cred-row:last-child { border-bottom: none; padding-bottom: 0; }
    .cred-row:first-of-type { padding-top: 0; }
    .cred-label {
      font-size: 12px;
      color: #6b7280;
      width: 88px;
      flex-shrink: 0;
      font-weight: 500;
    }
    .cred-value {
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: 13px;
      color: #1e1b4b;
      font-weight: 600;
      word-break: break-all;
    }
    .cred-value a { color: #1e1b4b; text-decoration: underline; }

    /* Warning */
    .warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 3px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: #78350f;
      line-height: 1.6;
      margin-bottom: 28px;
    }

    /* Buttons */
    .btn-group { margin-bottom: 32px; }
    .btn {
      display: block;
      text-align: center;
      padding: 14px 22px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      margin-bottom: 10px;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    }
    .btn:last-child { margin-bottom: 0; }
    .btn-primary {
      background: #a3e635;
      color: #1e1b4b;
    }
    .btn-secondary {
      background: #1e1b4b;
      color: #ffffff;
    }

    /* Divider */
    .divider {
      border: none;
      border-top: 1px solid #e0e7ff;
      margin: 28px 0;
    }

    /* Steps */
    .steps-title {
      font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #1e1b4b;
      margin-bottom: 20px;
    }
    .step {
      display: flex;
      gap: 14px;
      margin-bottom: 20px;
      align-items: flex-start;
    }
    .step:last-child { margin-bottom: 0; }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #1e1b4b;
      color: #a3e635;
      font-size: 13px;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
      margin-top: 1px;
    }
    .step-body { flex: 1; }
    .step-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e1b4b;
      margin-bottom: 4px;
    }
    .step-desc {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.6;
    }
    .step-desc a { color: #4f46e5; text-decoration: none; }
    .step-desc strong { color: #1e1b4b; }
    .step-desc code {
      background: #f8f7ff;
      border: 1px solid #e0e7ff;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 12px;
      font-family: 'Courier New', 'Lucida Console', monospace;
      color: #1e1b4b;
    }

    /* Footer */
    .footer {
      padding: 20px 36px;
      background: #12103a;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .footer p {
      font-size: 13px;
      color: #a5b4fc;
      line-height: 1.65;
    }
    .footer a { color: #a3e635; text-decoration: none; }
    .footer-copy {
      font-size: 11px;
      color: #4a4870;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- HEADER -->
    <div class="header" style="background:#1e1b4b;padding:28px 36px 24px;">
      <div class="logo-row" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span class="logo-mark" style="display:inline-block;width:32px;height:32px;background:#a3e635;border-radius:8px;text-align:center;line-height:32px;font-weight:800;font-size:14px;color:#1e1b4b;font-family:'Poppins',Arial,sans-serif;">L</span>
        <span class="logo-text" style="font-family:'Poppins',Arial,sans-serif;font-weight:700;font-size:18px;color:#ffffff;">Lameda</span>
      </div>
      <div class="header-title" style="font-family:'Poppins',Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff;margin-bottom:6px;">
        Your store is live. Start selling today.
      </div>
      <div class="header-sub" style="font-size:14px;color:#a5b4fc;">
        ${businessName} &middot; Everything you need is below
      </div>
    </div>

    <!-- BODY -->
    <div class="body" style="padding:36px;">

      <p class="greeting">
        Hi ${firstName},<br/><br/>
        Your Telegram bot <strong>@${botName}</strong> is connected and ready to receive orders.
        Save this email. It has your login details and a step-by-step guide to get your first sale.
      </p>

      <!-- Login credentials -->
      <span class="section-label" style="font-size:11px;font-weight:700;color:#a3e635;letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:10px;">Merchant Dashboard Login</span>
      <div class="creds" style="background:#f8f7ff;border:1px solid #e0e7ff;border-radius:10px;padding:20px 22px;margin-bottom:16px;">
        <div class="cred-row" style="display:flex;align-items:baseline;gap:12px;padding:8px 0;border-bottom:1px solid #e0e7ff;padding-top:0;">
          <span class="cred-label" style="font-size:12px;color:#6b7280;width:88px;flex-shrink:0;font-weight:500;">Portal</span>
          <span class="cred-value" style="font-family:'Courier New',monospace;font-size:13px;color:#1e1b4b;font-weight:600;word-break:break-all;"><a href="${crmLink}" style="color:#1e1b4b;">${crmLink}</a></span>
        </div>
        <div class="cred-row" style="display:flex;align-items:baseline;gap:12px;padding:8px 0;border-bottom:1px solid #e0e7ff;">
          <span class="cred-label" style="font-size:12px;color:#6b7280;width:88px;flex-shrink:0;font-weight:500;">Email</span>
          <span class="cred-value" style="font-family:'Courier New',monospace;font-size:13px;color:#1e1b4b;font-weight:600;word-break:break-all;">${loginEmail}</span>
        </div>
        <div class="cred-row" style="display:flex;align-items:baseline;gap:12px;padding:8px 0;padding-bottom:0;">
          <span class="cred-label" style="font-size:12px;color:#6b7280;width:88px;flex-shrink:0;font-weight:500;">Password</span>
          <span class="cred-value" style="font-family:'Courier New',monospace;font-size:13px;color:#1e1b4b;font-weight:600;word-break:break-all;">${tempPassword}</span>
        </div>
      </div>

      <!-- API key -->
      <span class="section-label" style="font-size:11px;font-weight:700;color:#a3e635;letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:10px;">API Key (for product import)</span>
      <div class="creds" style="background:#f8f7ff;border:1px solid #e0e7ff;border-radius:10px;padding:20px 22px;margin-bottom:20px;">
        <div class="cred-row" style="display:flex;align-items:baseline;gap:12px;padding:0;">
          <span class="cred-label" style="font-size:12px;color:#6b7280;width:88px;flex-shrink:0;font-weight:500;">API Key</span>
          <span class="cred-value" style="font-family:'Courier New',monospace;font-size:13px;color:#1e1b4b;font-weight:600;word-break:break-all;">${apiKey}</span>
        </div>
      </div>

      <div class="warning" style="background:#fffbeb;border:1px solid #fde68a;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;font-size:13px;color:#78350f;line-height:1.6;margin-bottom:28px;">
        &#9888;&#65039; <strong>Change your password</strong> when you first log in. This temporary password was sent by email. Your API key is unique to your account. Do not share it.
      </div>

      <!-- CTAs -->
      <div class="btn-group" style="margin-bottom:32px;">
        <a href="${crmLink}" class="btn btn-primary" style="display:block;text-align:center;padding:14px 22px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:10px;background:#a3e635;color:#1e1b4b;font-family:'Inter','Segoe UI',Arial,sans-serif;">
          Log in to your dashboard &rarr;
        </a>
        <a href="${telegramLink}" class="btn btn-secondary" style="display:block;text-align:center;padding:14px 22px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;background:#1e1b4b;color:#ffffff;font-family:'Inter','Segoe UI',Arial,sans-serif;">
          Open your bot on Telegram &rarr;
        </a>
      </div>

      <hr class="divider" style="border:none;border-top:1px solid #e0e7ff;margin:28px 0;" />

      <!-- Step by step guide -->
      <div class="steps-title" style="font-family:'Poppins','Segoe UI',Arial,sans-serif;font-size:16px;font-weight:700;color:#1e1b4b;margin-bottom:20px;">
        Getting started in 6 steps
      </div>

      <div class="step" style="display:flex;gap:14px;margin-bottom:20px;align-items:flex-start;">
        <span class="step-num" style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#1e1b4b;color:#a3e635;font-size:13px;font-weight:800;flex-shrink:0;font-family:'Poppins',Arial,sans-serif;">1</span>
        <div class="step-body">
          <div class="step-title" style="font-size:14px;font-weight:700;color:#1e1b4b;margin-bottom:4px;">Log in to your merchant dashboard</div>
          <div class="step-desc" style="font-size:13px;color:#6b7280;line-height:1.6;">
            Go to <a href="${crmLink}" style="color:#4f46e5;">${crmLink}</a> and sign in with your email and the temporary password above.
            Change your password on your first visit.
          </div>
        </div>
      </div>

      <div class="step" style="display:flex;gap:14px;margin-bottom:20px;align-items:flex-start;">
        <span class="step-num" style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#1e1b4b;color:#a3e635;font-size:13px;font-weight:800;flex-shrink:0;font-family:'Poppins',Arial,sans-serif;">2</span>
        <div class="step-body">
          <div class="step-title" style="font-size:14px;font-weight:700;color:#1e1b4b;margin-bottom:4px;">Import your product catalogue</div>
          <div class="step-desc" style="font-size:13px;color:#6b7280;line-height:1.6;">
            Prepare a CSV file with your products (name, price, description, stock quantity).
            Upload it from your dashboard or use the import API with your API key above.
            Your bot will immediately start showing these products to customers.
          </div>
        </div>
      </div>

      <div class="step" style="display:flex;gap:14px;margin-bottom:20px;align-items:flex-start;">
        <span class="step-num" style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#1e1b4b;color:#a3e635;font-size:13px;font-weight:800;flex-shrink:0;font-family:'Poppins',Arial,sans-serif;">3</span>
        <div class="step-body">
          <div class="step-title" style="font-size:14px;font-weight:700;color:#1e1b4b;margin-bottom:4px;">Connect your bot on Telegram</div>
          <div class="step-desc" style="font-size:13px;color:#6b7280;line-height:1.6;">
            Tap <strong style="color:#1e1b4b;">"Open your bot on Telegram"</strong> above, or search <code style="background:#f8f7ff;border:1px solid #e0e7ff;padding:1px 6px;border-radius:4px;font-size:12px;font-family:'Courier New',monospace;color:#1e1b4b;">@${botName}</code> on Telegram.
            Send any message to confirm it is working.
          </div>
        </div>
      </div>

      <div class="step" style="display:flex;gap:14px;margin-bottom:20px;align-items:flex-start;">
        <span class="step-num" style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#1e1b4b;color:#a3e635;font-size:13px;font-weight:800;flex-shrink:0;font-family:'Poppins',Arial,sans-serif;">4</span>
        <div class="step-body">
          <div class="step-title" style="font-size:14px;font-weight:700;color:#1e1b4b;margin-bottom:4px;">Set up your delivery zones</div>
          <div class="step-desc" style="font-size:13px;color:#6b7280;line-height:1.6;">
            From your dashboard, configure which areas you deliver to and your delivery fees.
            Customers will only see delivery options available in their location.
          </div>
        </div>
      </div>

      <div class="step" style="display:flex;gap:14px;margin-bottom:20px;align-items:flex-start;">
        <span class="step-num" style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#1e1b4b;color:#a3e635;font-size:13px;font-weight:800;flex-shrink:0;font-family:'Poppins',Arial,sans-serif;">5</span>
        <div class="step-body">
          <div class="step-title" style="font-size:14px;font-weight:700;color:#1e1b4b;margin-bottom:4px;">Share your bot link with customers</div>
          <div class="step-desc" style="font-size:13px;color:#6b7280;line-height:1.6;">
            Share <strong style="color:#1e1b4b;">t.me/${botName}</strong> on WhatsApp, Instagram, or your website.
            Customers tap the link, browse your catalogue, and place orders inside Telegram.
          </div>
        </div>
      </div>

      <div class="step" style="display:flex;gap:14px;margin-bottom:0;align-items:flex-start;">
        <span class="step-num" style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:#1e1b4b;color:#a3e635;font-size:13px;font-weight:800;flex-shrink:0;font-family:'Poppins',Arial,sans-serif;">6</span>
        <div class="step-body">
          <div class="step-title" style="font-size:14px;font-weight:700;color:#1e1b4b;margin-bottom:4px;">Track orders from your dashboard</div>
          <div class="step-desc" style="font-size:13px;color:#6b7280;line-height:1.6;">
            Every order placed through your bot appears in your merchant dashboard in real time.
            You can view order details, customer info, and update delivery status from there.
          </div>
        </div>
      </div>

    </div>

    <!-- FOOTER -->
    <div class="footer" style="padding:20px 36px;background:#12103a;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="font-size:13px;color:#a5b4fc;line-height:1.65;">
        You are receiving this because you registered <strong style="color:#fff;">${businessName}</strong> on Lameda.<br/>
        Need help? Reply to this email or contact us at <a href="mailto:hello@lameda.ng" style="color:#a3e635;text-decoration:none;">hello@lameda.ng</a>
      </p>
      <p class="footer-copy" style="font-size:11px;color:#4a4870;margin-top:10px;">
        &copy; 2025 Lameda. Lagos, Nigeria.
      </p>
    </div>

  </div>
</body>
</html>
`

  const text = `
Hi ${firstName},

Your Telegram bot @${botName} is connected and ready to receive orders.
Save this email. It has your login details and a guide to get your first sale.

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

Change your password when you first log in. This temporary password was sent by email.
Do not share your API key with anyone.

GETTING STARTED IN 6 STEPS:

1. LOG IN TO YOUR DASHBOARD
   Visit ${crmLink} and sign in with your email and the temporary password above.
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
   Customers tap the link, browse your catalogue, and place orders inside Telegram.

6. TRACK ORDERS FROM YOUR DASHBOARD
   Every order appears in your merchant dashboard in real time.

---
Lameda | hello@lameda.ng
You are receiving this because you registered ${businessName} on Lameda.
(c) 2025 Lameda. Lagos, Nigeria.
`.trim()

  return { subject, html, text }
}
