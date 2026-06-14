import Image from 'next/image'
import Link from 'next/link'

const container = 'max-w-[1100px] mx-auto px-8'

export function MarketingPage() {
  return (
    <>
      {/* ── NAV ── */}
      <nav className="bg-lm-indigo sticky top-0 z-50 border-b border-white/[0.07]">
        <div className={container}>
          <div className="flex items-center justify-between py-3.5">
            <Link href="/" className="flex items-center gap-2.5 no-underline">
              <div className="w-[30px] h-[30px] bg-lm-lime rounded-[7px] flex items-center justify-center">
                <span className="font-poppins font-black text-[0.9rem] text-lm-indigo">L</span>
              </div>
              <span className="font-poppins font-bold text-base text-white">Lameda</span>
            </Link>
            <div className="flex items-center gap-8">
              <a
                href="#how"
                className="text-[0.88rem] text-lm-lavender no-underline font-medium hover:text-white transition-colors"
              >
                How it works
              </a>
              <a
                href="#pricing"
                className="text-[0.88rem] text-lm-lavender no-underline font-medium hover:text-white transition-colors"
              >
                Pricing
              </a>
              <Link
                href="/login"
                className="text-[0.88rem] text-lm-lavender no-underline font-medium hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/onboard"
                className="bg-lm-lime text-lm-indigo text-[0.88rem] font-bold px-[18px] py-2 rounded-[6px] no-underline hover:opacity-90 transition-opacity"
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-lm-indigo pt-20 overflow-hidden">
        <div className={container}>
          <div className="grid grid-cols-2 gap-12 items-center">
            <div className="pb-16">
              <h1 className="font-poppins text-[2.75rem] font-black text-white leading-[1.12] mb-5">
                From &lsquo;I want it&rsquo;<br />to paid,<br />
                in <span className="text-lm-lime">4 taps.</span>
              </h1>
              <p className="text-[1.05rem] text-lm-lavender leading-[1.7] mb-2.5 max-w-[440px]">
                Lameda turns your product catalogue into a shopping experience inside WhatsApp and
                Telegram. No website, no app, no developer needed.
              </p>
              <p className="text-[0.95rem] font-semibold text-lm-lime mb-8">
                They tap. They browse. They pay. You get notified.
              </p>
              <div className="flex flex-col gap-2.5 items-start">
                <Link
                  href="/onboard"
                  className="inline-flex items-center gap-2 bg-lm-lime text-lm-indigo text-[0.96rem] font-bold px-[26px] py-3.5 rounded-[7px] no-underline hover:opacity-90 transition-opacity font-inter"
                >
                  Set up my store, it&rsquo;s free &rarr;
                </Link>
                <span className="text-[0.84rem] text-lm-muted-dark">
                  14-day free trial &middot; No card required &middot; Live in 5 minutes
                </span>
              </div>
              <div className="flex gap-2.5 mt-6 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-lm-lime/10 border border-lm-lime/45 text-lm-lime text-[0.84rem] font-semibold px-[18px] py-2.5 rounded-[8px]">
                  ✓ Telegram · available now
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/[0.18] text-lm-muted-dark text-[0.84rem] font-semibold px-[18px] py-2.5 rounded-[8px]">
                  ⏳ WhatsApp · coming soon
                </span>
              </div>
              <div className="flex items-center gap-5 mt-5 flex-wrap">
                <span className="text-[0.84rem] text-lm-muted-dark">🔒 Paystack payments</span>
                <span className="text-lm-indigo-mid">·</span>
                <span className="text-[0.84rem] text-lm-muted-dark">🇳🇬 NDPR Compliant</span>
                <span className="text-lm-indigo-mid">·</span>
                <span className="text-[0.84rem] text-lm-muted-dark">✓ CAC Registered</span>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div
                className="w-full max-w-[440px] overflow-hidden border border-lm-lime/15 border-b-0"
                style={{ borderRadius: '20px 20px 0 0', boxShadow: '0 -20px 60px rgba(163,230,53,0.12)' }}
              >
                <div className="relative h-[420px]">
                  <Image
                    src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=560&q=85&auto=format&fit=crop"
                    alt="Merchant managing their product catalogue on a phone"
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 100vw, 440px"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIN ── */}
      <section className="bg-lm-surface py-20">
        <div className={container}>
          <div className="grid grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-[0.78rem] font-bold text-lm-lime tracking-[0.12em] uppercase mb-2 block">
                Sound familiar?
              </span>
              <h2 className="font-poppins text-[2rem] font-black text-lm-indigo leading-[1.2] mb-3">
                Running a business<br />from your DMs<br />is exhausting.
              </h2>
              <p className="text-[0.96rem] text-lm-muted max-w-[500px] mb-10">
                You did not start a business to spend your whole day copying orders and chasing payments.
              </p>
              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { hi: true, emoji: '📋', title: 'Order chaos', body: 'Customer sends a message. You reply. You note it somewhere. Then you forget. Then they ask again.' },
                  { hi: true, emoji: '🌙', title: 'Missed night sales', body: 'A customer wanted to buy at 11pm. Nobody replied. By morning, they had found someone else.' },
                  { hi: false, emoji: '💸', title: 'Did they actually pay?', body: 'They send a screenshot. You check your account. You wait. You release the goods. It bounces.' },
                  { hi: false, emoji: '📢', title: 'Restocked. Nobody knows.', body: 'New stock arrived. You post a status. 20 people see it. Your other 300 customers have no idea.' },
                ].map((card) => (
                  <div
                    key={card.title}
                    className={`bg-white border rounded-xl p-5 ${card.hi ? 'border-lm-border border-t-[3px] border-t-lm-lime' : 'border-lm-border'}`}
                  >
                    <span className="text-2xl mb-2.5 block">{card.emoji}</span>
                    <div className="font-poppins text-[0.88rem] font-bold text-lm-indigo mb-1.5">{card.title}</div>
                    <div className="text-[0.85rem] text-lm-muted leading-[1.55]">{card.body}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-5 bg-lm-indigo rounded-xl">
                <strong className="font-poppins text-[0.98rem] text-white block mb-1">
                  Lameda handles all of this. Automatically.
                </strong>
                <p className="text-[0.86rem] text-lm-lavender">
                  So you can focus on what actually moves your business.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-full rounded-2xl overflow-hidden h-[380px] shadow-[0_20px_40px_rgba(30,27,75,0.12)]">
                <Image
                  src="https://images.unsplash.com/photo-1596558450268-9c27524ba856?w=560&q=85&auto=format&fit=crop"
                  alt="Merchant overwhelmed by DMs and order messages on their phone"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white py-20" id="how">
        <div className={container}>
          <div className="mb-12">
            <span className="text-[0.78rem] font-bold text-lm-lime tracking-[0.12em] uppercase mb-2 block">How it works</span>
            <h2 className="font-poppins text-[2rem] font-black text-lm-indigo leading-[1.2]">
              You set up once.<br />Your customers buy forever.
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-14 items-center">
            <div className="flex flex-col gap-8">
              {[
                { n: '1', title: 'Add your products', body: 'Upload photos, set prices, connect your Paystack account. Takes about 5 minutes.' },
                { n: '2', title: 'Share your store link', body: 'You get a unique link. Drop it in your WhatsApp status, Telegram channel, or Instagram bio.' },
                { n: '3', title: 'Get paid automatically', body: 'Orders come in, payments are verified by Paystack, and you are notified. No manual checking.' },
              ].map((step) => (
                <div key={step.n} className="flex gap-5 items-start">
                  <div className="w-10 h-10 min-w-[40px] bg-lm-indigo rounded-[10px] flex items-center justify-center font-poppins font-black text-[0.9rem] text-lm-lime">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="font-poppins text-base font-bold text-lm-indigo mb-1.5">{step.title}</h3>
                    <p className="text-[0.9rem] text-lm-muted leading-[1.6]">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-full rounded-2xl overflow-hidden h-[380px] shadow-[0_20px_40px_rgba(30,27,75,0.1)]">
                <Image
                  src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=560&q=85&auto=format&fit=crop"
                  alt="Merchant setting up their product catalogue on a phone"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-lm-indigo mt-14 py-10">
          <div className={container}>
            <span className="text-[0.78rem] font-bold text-lm-lime tracking-[0.12em] uppercase mb-6 block">
              The buying experience, your customer&apos;s side
            </span>
            <div className="grid grid-cols-4 gap-4">
              {[
                { tap: 'Tap 1', icon: '💬', title: 'Open your store link', sub: 'In WhatsApp or Telegram', final: false },
                { tap: 'Tap 2', icon: '🛍️', title: 'Browse and pick an item', sub: 'No scrolling through DMs', final: false },
                { tap: 'Tap 3', icon: '✓', title: 'Confirm the order', sub: 'Quantity, address, done', final: false },
                { tap: 'Tap 4', icon: '💳', title: 'Pay securely', sub: 'Card, transfer, USSD', final: true },
              ].map((card) => (
                <div
                  key={card.tap}
                  className={`rounded-[10px] p-[1.1rem] ${card.final ? 'bg-lm-lime border border-lm-lime' : 'bg-white/5 border border-white/[0.08]'}`}
                >
                  <div className={`text-[0.72rem] font-bold tracking-[0.1em] uppercase mb-2 ${card.final ? 'text-lm-indigo' : 'text-lm-lime'}`}>
                    {card.tap}
                  </div>
                  <span className="text-[1.3rem] mb-1.5 block">{card.icon}</span>
                  <div className={`font-poppins text-[0.85rem] font-bold mb-0.5 ${card.final ? 'text-lm-indigo' : 'text-white'}`}>
                    {card.title}
                  </div>
                  <div className={`text-[0.78rem] ${card.final ? 'text-lm-indigo/70' : 'text-lm-muted-dark'}`}>
                    {card.sub}
                  </div>
                </div>
              ))}
            </div>
            <span className="text-[0.9rem] font-semibold text-lm-lime mt-5 block">
              Order placed. Payment verified. You both get a confirmation. That is it.
            </span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-lm-surface py-20">
        <div className={container}>
          <div className="mb-10">
            <span className="text-[0.78rem] font-bold text-lm-lime tracking-[0.12em] uppercase mb-2 block">What Lameda does for you</span>
            <h2 className="font-poppins text-[2rem] font-black text-lm-indigo leading-[1.2]">
              Everything your store needs.<br />Nothing you do not.
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { icon: '🤖', title: '24/7 automated store', body: 'Your bot takes orders and answers product questions while you sleep, eat, or rest.' },
              { icon: '✓', title: 'Verified payments only', body: 'Paystack confirms every payment before your customer gets an order confirmation. No more fake alerts.' },
              { icon: '📦', title: 'Product catalogue', body: 'Add photos, prices, and descriptions. Customers browse it directly inside WhatsApp or Telegram.' },
              { icon: '📊', title: 'Sales dashboard', body: 'See every order, every payment, and every customer in one place. No more counting notebooks.' },
              { icon: '📢', title: 'Customer broadcasts', body: 'Restocked? New promo? Send a message to all your opted-in customers at once.' },
              { icon: '👥', title: 'Team access', body: 'Add sales reps who manage orders and customers without touching your payments or settings.' },
            ].map((feat) => (
              <div key={feat.title} className="bg-white border border-lm-border rounded-xl p-6">
                <span className="text-2xl mb-3 block">{feat.icon}</span>
                <div className="font-poppins text-[0.92rem] font-bold text-lm-indigo mb-1.5">{feat.title}</div>
                <div className="text-[0.86rem] text-lm-muted leading-[1.6]">{feat.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="bg-white py-20" id="pricing">
        <div className={container}>
          <div className="mb-10">
            <span className="text-[0.78rem] font-bold text-lm-lime tracking-[0.12em] uppercase mb-2 block">Pricing</span>
            <h2 className="font-poppins text-[2rem] font-black text-lm-indigo leading-[1.2] mb-3">
              Simple. Naira. No surprises.
            </h2>
            <p className="text-[0.96rem] text-lm-muted">Start free for 14 days. No card required.</p>
          </div>
          <div className="grid grid-cols-3 gap-5">
            <div className="border border-lm-border rounded-[14px] p-7">
              <div className="font-poppins text-[0.92rem] font-bold text-lm-indigo mb-1">Starter</div>
              <div className="font-poppins text-[1.75rem] font-black text-lm-indigo mb-1">
                <sup className="text-base font-semibold">₦</sup>5,000
                <span className="text-[0.84rem] font-normal text-gray-400">/mo</span>
              </div>
              <div className="text-[0.84rem] text-gray-400 mb-5 pb-5 border-b border-gray-100">For new stores getting their first orders.</div>
              <ul className="flex flex-col gap-2.5 mb-6 list-none p-0">
                {['Bot store (Telegram)', 'Unlimited products', 'Paystack payments', 'Order notifications'].map((f) => (
                  <li key={f} className="text-[0.86rem] text-lm-muted flex items-center gap-2">
                    <span className="text-lm-lime font-bold text-[0.84rem]">✓</span>{f}
                  </li>
                ))}
                {['Customer broadcasts', 'Team access'].map((f) => (
                  <li key={f} className="text-[0.86rem] text-gray-300 flex items-center gap-2">
                    <span className="text-gray-300">-</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/onboard" className="block text-center bg-lm-indigo text-white text-[0.86rem] font-bold py-2.5 rounded-[7px] no-underline">
                Start free trial
              </Link>
            </div>
            <div className="border-2 border-lm-lime rounded-[14px] p-7 relative">
              <div className="absolute -top-3 left-6 bg-lm-lime text-lm-indigo text-[0.72rem] font-bold px-2.5 py-0.5 rounded-[10px]">
                Most popular
              </div>
              <div className="font-poppins text-[0.92rem] font-bold text-lm-indigo mb-1">Growth</div>
              <div className="font-poppins text-[1.75rem] font-black text-lm-indigo mb-1">
                <sup className="text-base font-semibold">₦</sup>15,000
                <span className="text-[0.84rem] font-normal text-gray-400">/mo</span>
              </div>
              <div className="text-[0.84rem] text-gray-400 mb-5 pb-5 border-b border-gray-100">For busy stores scaling up sales.</div>
              <ul className="flex flex-col gap-2.5 mb-6 list-none p-0">
                {['Everything in Starter', 'Customer broadcasts', 'Sales analytics', '1 sales rep'].map((f) => (
                  <li key={f} className="text-[0.86rem] text-lm-muted flex items-center gap-2">
                    <span className="text-lm-lime font-bold text-[0.84rem]">✓</span>{f}
                  </li>
                ))}
                {['WhatsApp (coming)', 'Priority support'].map((f) => (
                  <li key={f} className="text-[0.86rem] text-gray-300 flex items-center gap-2">
                    <span className="text-gray-300">-</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/onboard" className="block text-center bg-lm-lime text-lm-indigo text-[0.86rem] font-bold py-2.5 rounded-[7px] no-underline">
                Start free trial
              </Link>
            </div>
            <div className="border border-lm-border rounded-[14px] p-7">
              <div className="font-poppins text-[0.92rem] font-bold text-lm-indigo mb-1">Pro</div>
              <div className="font-poppins text-[1.75rem] font-black text-lm-indigo mb-1">
                <sup className="text-base font-semibold">₦</sup>40,000
                <span className="text-[0.84rem] font-normal text-gray-400">/mo</span>
              </div>
              <div className="text-[0.84rem] text-gray-400 mb-5 pb-5 border-b border-gray-100">For high-volume merchants who need it all.</div>
              <ul className="flex flex-col gap-2.5 mb-6 list-none p-0">
                {['Everything in Growth', 'WhatsApp (coming soon)', 'Multiple sales reps', 'Advanced analytics', 'Priority support', 'Dedicated onboarding'].map((f) => (
                  <li key={f} className="text-[0.86rem] text-lm-muted flex items-center gap-2">
                    <span className="text-lm-lime font-bold text-[0.84rem]">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/onboard" className="block text-center bg-lm-indigo text-white text-[0.86rem] font-bold py-2.5 rounded-[7px] no-underline">
                Start free trial
              </Link>
            </div>
          </div>
          <p className="text-[0.84rem] text-gray-400 mt-6">
            All plans include a 14-day free trial. Payments processed securely by Paystack.
          </p>
        </div>
      </section>

      {/* ── TRUST ── */}
      <section className="bg-lm-surface py-20">
        <div className={container}>
          <div className="grid grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-8">
                <span className="text-[0.78rem] font-bold text-lm-lime tracking-[0.12em] uppercase mb-2 block">Built to be trusted</span>
                <h2 className="font-poppins text-[2rem] font-black text-lm-indigo leading-[1.2]">
                  Your money and your<br />data are safe with us.
                </h2>
              </div>
              <div className="flex flex-col gap-4">
                {[
                  { icon: '🔒', title: 'Payments by Paystack', body: 'Every transaction goes through Paystack, a CBN-licensed payment processor trusted by thousands of Nigerian businesses.' },
                  { icon: '🇳🇬', title: 'NDPR Compliant', body: 'Your customer data is stored and handled in line with the Nigeria Data Protection Regulation.' },
                  { icon: '📋', title: 'CAC Registered', body: 'Lameda is a registered Nigerian business. We are not going anywhere.' },
                ].map((card) => (
                  <div key={card.title} className="bg-white border border-lm-border rounded-xl p-5 flex gap-4 items-start">
                    <div className="text-[1.3rem] min-w-[2rem]">{card.icon}</div>
                    <div>
                      <div className="font-poppins text-[0.9rem] font-bold text-lm-indigo mb-1">{card.title}</div>
                      <div className="text-[0.86rem] text-lm-muted leading-[1.55]">{card.body}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 bg-lm-indigo rounded-xl p-6">
                <h3 className="font-poppins text-[0.98rem] font-bold text-white mb-2">
                  🌿 Be among the first.
                </h3>
                <p className="text-[0.88rem] text-lm-lavender leading-[1.65]">
                  Lameda is new and growing. Early merchants get direct access to us. Your feedback
                  shapes what we build next. This is your chance to get in before everyone else does.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-full rounded-2xl overflow-hidden h-[400px] shadow-[0_20px_40px_rgba(30,27,75,0.1)]">
                <Image
                  src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=560&q=85&auto=format&fit=crop"
                  alt="Nigerian merchant confidently managing their online store"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-lm-indigo py-24 text-center">
        <div className={container}>
          <h2 className="font-poppins text-[2.5rem] font-black text-white leading-[1.2] mb-4">
            Your first sale is<br />closer than you think.
          </h2>
          <p className="text-[1.05rem] text-lm-lavender mb-8">
            Set up your store in 5 minutes. No code. No developer. Free for 14 days.
          </p>
          <Link
            href="/onboard"
            className="inline-flex items-center gap-2 bg-lm-lime text-lm-indigo text-[0.96rem] font-bold px-[26px] py-3.5 rounded-[7px] no-underline hover:opacity-90 transition-opacity font-inter"
          >
            Launch my free store &rarr;
          </Link>
          <span className="text-[0.86rem] text-lm-muted-dark mt-4 block">
            Available now on Telegram. WhatsApp coming soon.
          </span>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-lm-indigo-dark py-10">
        <div className={container}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Link href="/" className="flex items-center gap-2.5 no-underline">
              <div className="w-[30px] h-[30px] bg-lm-lime rounded-[7px] flex items-center justify-center">
                <span className="font-poppins font-black text-[0.9rem] text-lm-indigo">L</span>
              </div>
              <span className="font-poppins font-bold text-base text-white">Lameda</span>
            </Link>
            <div className="flex gap-6 flex-wrap">
              {[
                { label: 'How it works', href: '#how' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'Sign in', href: '/login' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms', href: '/terms' },
              ].map((link) => (
                <a key={link.label} href={link.href} className="text-[0.86rem] text-lm-muted-dark no-underline hover:text-white transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="text-[0.82rem] text-[#4a4870] mt-4 pt-4 border-t border-white/5 w-full">
            &copy; 2025 Lameda. All rights reserved. Lagos, Nigeria.
          </div>
        </div>
      </footer>
    </>
  )
}
