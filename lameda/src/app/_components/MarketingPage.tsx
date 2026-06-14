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
              <a href="#how" className="text-[0.88rem] text-lm-lavender no-underline font-medium hover:text-white transition-colors">
                How it works
              </a>
              <a href="#pricing" className="text-[0.88rem] text-lm-lavender no-underline font-medium hover:text-white transition-colors">
                Pricing
              </a>
              <Link href="/login" className="text-[0.88rem] text-lm-lavender no-underline font-medium hover:text-white transition-colors">
                Sign in
              </Link>
              <Link href="/onboard" className="bg-lm-lime text-lm-indigo text-[0.88rem] font-bold px-[18px] py-2 rounded-[6px] no-underline hover:opacity-90 transition-opacity">
                Start free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO — image RIGHT ── */}
      <section className="flex min-h-[680px] bg-lm-indigo">
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[580px] ml-auto pl-8 pr-10 lg:pr-16 py-20 lg:py-28">
            <h1 className="font-poppins text-[2.75rem] font-black text-white leading-[1.12] mb-5">
              From &lsquo;I want it&rsquo;<br />to paid,<br />
              in <span className="text-lm-lime">4 taps.</span>
            </h1>
            <p className="text-[1.05rem] text-lm-lavender leading-[1.7] mb-2.5">
              Lameda turns your product catalogue into a shopping experience inside WhatsApp and
              Telegram. No website, no app, no developer needed.
            </p>
            <p className="text-[0.95rem] font-semibold text-lm-lime mb-8">
              They tap. They browse. They pay. You get notified.
            </p>
            <div className="flex flex-col gap-2.5 items-start">
              <Link
                href="/onboard"
                className="inline-flex items-center gap-2 bg-lm-lime text-lm-indigo text-[0.96rem] font-bold px-[26px] py-3.5 rounded-[7px] no-underline hover:opacity-90 transition-opacity"
              >
                Set up my store, it&rsquo;s free &rarr;
              </Link>
              <span className="text-[0.84rem] text-lm-muted-dark">
                14-day free trial &middot; No card required &middot; Live in 5 minutes
              </span>
            </div>
            <div className="flex gap-6 mt-6 flex-wrap">
              <span className="text-[0.84rem] font-semibold text-lm-lime">Telegram available now</span>
              <span className="text-[0.84rem] text-lm-muted-dark">WhatsApp coming soon</span>
            </div>
            <div className="flex items-center gap-5 mt-5 flex-wrap">
              <span className="text-[0.84rem] text-lm-muted-dark">Verified payments</span>
              <span className="text-lm-indigo-mid">&middot;</span>
              <span className="text-[0.84rem] text-lm-muted-dark">NDPR compliant</span>
              <span className="text-lm-indigo-mid">&middot;</span>
              <span className="text-[0.84rem] text-lm-muted-dark">CAC registered</span>
            </div>
          </div>
        </div>
        {/* Image — right panel, bleeds to edge */}
        <div className="hidden lg:block w-[45%] relative overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=900&q=85&auto=format&fit=crop"
            alt="Merchant managing their product catalogue on a phone"
            fill
            className="object-cover object-center"
            sizes="45vw"
            priority
          />
          {/* Gradient blends left edge into section colour — kept light so the photo reads through */}
          <div className="absolute inset-0 bg-gradient-to-r from-lm-indigo/90 via-lm-indigo/20 to-transparent" />
        </div>
      </section>

      {/* ── PAIN — image LEFT ── */}
      <section className="flex min-h-[680px] bg-lm-surface">
        {/* Image — left panel, bleeds to edge */}
        <div className="hidden lg:block w-[45%] relative overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1596558450268-9c27524ba856?w=900&q=85&auto=format&fit=crop"
            alt="Merchant overwhelmed by DMs and order messages"
            fill
            className="object-cover object-center"
            sizes="45vw"
          />
          {/* Gradient blends right edge into section colour */}
          <div className="absolute inset-0 bg-gradient-to-l from-lm-surface via-lm-surface/50 to-transparent" />
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[580px] mr-auto pr-8 pl-10 lg:pl-16 py-20 lg:py-28">
            <span className="text-[0.78rem] font-bold text-lm-lime tracking-[0.12em] uppercase mb-2 block">
              Sound familiar?
            </span>
            <h2 className="font-poppins text-[2rem] font-black text-lm-indigo leading-[1.2] mb-3">
              Running a business<br />from your DMs<br />is exhausting.
            </h2>
            <p className="text-[0.96rem] text-lm-muted mb-8">
              You did not start a business to spend your whole day copying orders and chasing payments.
            </p>
            <div className="grid grid-cols-2 gap-3.5">
              {[
                { n: '01', hi: true, title: 'Order chaos', body: 'Customer sends a message. You reply. You note it. Then you forget. Then they ask again.' },
                { n: '02', hi: true, title: 'Missed night sales', body: 'A customer wanted to buy at 11pm. Nobody replied. By morning, they had found someone else.' },
                { n: '03', hi: false, title: 'Did they actually pay?', body: 'They send a screenshot. You check your account. You wait. You release the goods. It bounces.' },
                { n: '04', hi: false, title: 'Restocked. Nobody knows.', body: 'New stock arrived. 20 people see your status. Your other 300 customers have no idea.' },
              ].map((card) => (
                <div
                  key={card.title}
                  className={`bg-white border rounded-xl p-5 ${card.hi ? 'border-lm-border border-t-[3px] border-t-lm-lime' : 'border-lm-border'}`}
                >
                  <div className="font-mono text-[0.68rem] font-bold text-lm-muted-dark mb-3 tracking-widest">{card.n}</div>
                  <div className="font-poppins text-[0.88rem] font-bold text-lm-indigo mb-1.5">{card.title}</div>
                  <div className="text-[0.85rem] text-lm-muted leading-[1.55]">{card.body}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-5 bg-lm-indigo rounded-xl">
              <strong className="font-poppins text-[0.98rem] text-white block mb-1">
                Lameda handles all of this. Automatically.
              </strong>
              <p className="text-[0.86rem] text-lm-lavender">
                So you can focus on what actually moves your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — image RIGHT ── */}
      <section className="flex min-h-[620px] bg-white" id="how">
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[580px] ml-auto pl-8 pr-10 lg:pr-16 py-20 lg:py-28">
            <span className="text-[0.78rem] font-bold text-lm-lime tracking-[0.12em] uppercase mb-2 block">
              How it works
            </span>
            <h2 className="font-poppins text-[2rem] font-black text-lm-indigo leading-[1.2] mb-10">
              You set up once.<br />Your customers buy forever.
            </h2>
            <div className="flex flex-col gap-8">
              {[
                { n: '1', title: 'Add your products', body: 'Upload photos, set prices, connect your payment account. Takes about 5 minutes.' },
                { n: '2', title: 'Share your store link', body: 'You get a unique link. Drop it in your WhatsApp status, Telegram channel, or Instagram bio.' },
                { n: '3', title: 'Get paid automatically', body: 'Orders come in, payments are verified automatically, and you are notified. No manual checking.' },
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
          </div>
        </div>
        {/* Image — right panel */}
        <div className="hidden lg:block w-[45%] relative overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=85&auto=format&fit=crop"
            alt="Merchant setting up their product catalogue on a phone"
            fill
            className="object-cover object-center"
            sizes="45vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-transparent" />
        </div>
      </section>

      {/* ── 4-TAP FLOW — full-width strip ── */}
      <div className="bg-lm-indigo py-10">
        <div className={container}>
          <span className="text-[0.78rem] font-bold text-lm-lime tracking-[0.12em] uppercase mb-8 block">
            The buying experience, your customer&apos;s side
          </span>
          <div className="grid grid-cols-4 gap-6">
            {[
              { tap: 'Step 1', title: 'Open your store link', sub: 'In WhatsApp or Telegram', final: false },
              { tap: 'Step 2', title: 'Browse and pick an item', sub: 'No scrolling through DMs', final: false },
              { tap: 'Step 3', title: 'Confirm the order', sub: 'Quantity, address, done', final: false },
              { tap: 'Step 4', title: 'Pay securely', sub: 'Card, transfer, USSD', final: true },
            ].map((step) => (
              <div key={step.tap} className={`border-t pt-5 ${step.final ? 'border-lm-lime' : 'border-white/20'}`}>
                <div className={`text-[0.72rem] font-bold tracking-[0.1em] uppercase mb-3 ${step.final ? 'text-lm-lime' : 'text-lm-muted-dark'}`}>
                  {step.tap}
                </div>
                <div className={`font-poppins text-[0.92rem] font-bold mb-1.5 ${step.final ? 'text-lm-lime' : 'text-white'}`}>
                  {step.title}
                </div>
                <div className="text-[0.8rem] text-lm-muted-dark leading-[1.5]">{step.sub}</div>
              </div>
            ))}
          </div>
          <p className="text-[0.9rem] font-semibold text-lm-lime mt-8">
            Order placed. Payment verified. You both get a confirmation.
          </p>
        </div>
      </div>

      {/* ── FEATURES — image LEFT ── */}
      <section className="flex min-h-[700px] bg-lm-surface">
        {/* Image — left panel */}
        <div className="hidden lg:block w-[45%] relative overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=900&q=85&auto=format&fit=crop"
            alt="Nigerian merchant confidently managing their online store"
            fill
            className="object-cover object-center"
            sizes="45vw"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-lm-surface via-lm-surface/50 to-transparent" />
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[580px] mr-auto pr-8 pl-10 lg:pl-16 py-20 lg:py-28">
            <span className="text-[0.78rem] font-bold text-lm-lime tracking-[0.12em] uppercase mb-2 block">
              What Lameda does for you
            </span>
            <h2 className="font-poppins text-[2rem] font-black text-lm-indigo leading-[1.2] mb-3">
              Everything your store needs.<br />Nothing you do not.
            </h2>
            <p className="text-[0.96rem] text-lm-muted mb-10">
              Built for merchants who are serious about selling online, without the complexity of building a website.
            </p>
            <div className="flex flex-col gap-6">
              {[
                { title: '24/7 automated store', body: 'Your bot takes orders and answers product questions while you sleep, eat, or rest.' },
                { title: 'Verified payments only', body: 'Every payment is automatically confirmed before your customer gets a receipt. No more fake alerts or bounced transfers.' },
                { title: 'Product catalogue', body: 'Add photos, prices, and descriptions. Customers browse directly inside WhatsApp or Telegram.' },
                { title: 'Sales dashboard', body: 'Every order, every payment, every customer in one place. No more counting notebooks.' },
                { title: 'Customer broadcasts', body: 'Restocked? New promo? Send a message to all opted-in customers at once.' },
                { title: 'Team access', body: 'Add sales reps who manage orders without touching your payments or settings.' },
              ].map((feat) => (
                <div key={feat.title} className="border-l-[2px] border-lm-lime pl-5">
                  <div className="font-poppins text-[0.92rem] font-bold text-lm-indigo mb-1">{feat.title}</div>
                  <div className="text-[0.86rem] text-lm-muted leading-[1.6]">{feat.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING — container layout, no image ── */}
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
                <sup className="text-base font-semibold">&#8358;</sup>5,000
                <span className="text-[0.84rem] font-normal text-gray-400">/mo</span>
              </div>
              <div className="text-[0.84rem] text-gray-400 mb-5 pb-5 border-b border-gray-100">For new stores getting their first orders.</div>
              <ul className="flex flex-col gap-2.5 mb-6 list-none p-0">
                {['Bot store (Telegram)', 'Unlimited products', 'Secure payments', 'Order notifications'].map((f) => (
                  <li key={f} className="text-[0.86rem] text-lm-muted flex items-center gap-2">
                    <span className="text-lm-lime font-bold">&#10003;</span>{f}
                  </li>
                ))}
                {['Customer broadcasts', 'Team access'].map((f) => (
                  <li key={f} className="text-[0.86rem] text-gray-300 flex items-center gap-2">
                    <span className="text-gray-300">&#8211;</span>{f}
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
                <sup className="text-base font-semibold">&#8358;</sup>15,000
                <span className="text-[0.84rem] font-normal text-gray-400">/mo</span>
              </div>
              <div className="text-[0.84rem] text-gray-400 mb-5 pb-5 border-b border-gray-100">For busy stores scaling up sales.</div>
              <ul className="flex flex-col gap-2.5 mb-6 list-none p-0">
                {['Everything in Starter', 'Customer broadcasts', 'Sales analytics', '1 sales rep'].map((f) => (
                  <li key={f} className="text-[0.86rem] text-lm-muted flex items-center gap-2">
                    <span className="text-lm-lime font-bold">&#10003;</span>{f}
                  </li>
                ))}
                {['WhatsApp (coming)', 'Priority support'].map((f) => (
                  <li key={f} className="text-[0.86rem] text-gray-300 flex items-center gap-2">
                    <span className="text-gray-300">&#8211;</span>{f}
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
                <sup className="text-base font-semibold">&#8358;</sup>40,000
                <span className="text-[0.84rem] font-normal text-gray-400">/mo</span>
              </div>
              <div className="text-[0.84rem] text-gray-400 mb-5 pb-5 border-b border-gray-100">For high-volume merchants who need it all.</div>
              <ul className="flex flex-col gap-2.5 mb-6 list-none p-0">
                {['Everything in Growth', 'WhatsApp (coming soon)', 'Multiple sales reps', 'Advanced analytics', 'Priority support', 'Dedicated onboarding'].map((f) => (
                  <li key={f} className="text-[0.86rem] text-lm-muted flex items-center gap-2">
                    <span className="text-lm-lime font-bold">&#10003;</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/onboard" className="block text-center bg-lm-indigo text-white text-[0.86rem] font-bold py-2.5 rounded-[7px] no-underline">
                Start free trial
              </Link>
            </div>
          </div>
          <p className="text-[0.84rem] text-gray-400 mt-6">
            All plans include a 14-day free trial. No card required to start.
          </p>
        </div>
      </section>

      {/* ── TRUST — image RIGHT ── */}
      <section className="flex min-h-[620px] bg-lm-surface">
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[580px] ml-auto pl-8 pr-10 lg:pr-16 py-20 lg:py-28">
            <span className="text-[0.78rem] font-bold text-lm-lime tracking-[0.12em] uppercase mb-2 block">
              Built to be trusted
            </span>
            <h2 className="font-poppins text-[2rem] font-black text-lm-indigo leading-[1.2] mb-8">
              Your money and your<br />data are safe with us.
            </h2>
            <div className="flex flex-col gap-4">
              {[
                { title: 'Secure, verified payments', body: 'Every transaction is verified automatically before your customer gets confirmation. No fake alerts, no bounced payments.' },
                { title: 'NDPR Compliant', body: 'Your customer data is stored and handled in line with the Nigeria Data Protection Regulation.' },
                { title: 'CAC Registered', body: 'Lameda is a registered Nigerian business. We are not going anywhere.' },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-white border border-lm-border rounded-xl p-5"
                  style={{ borderLeft: '3px solid var(--color-lm-lime)' }}
                >
                  <div className="font-poppins text-[0.9rem] font-bold text-lm-indigo mb-1">{card.title}</div>
                  <div className="text-[0.86rem] text-lm-muted leading-[1.55]">{card.body}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 bg-lm-indigo rounded-xl p-6">
              <h3 className="font-poppins text-[0.98rem] font-bold text-white mb-2">Be among the first.</h3>
              <p className="text-[0.88rem] text-lm-lavender leading-[1.65]">
                Lameda is new and growing. Early merchants get direct access to us. Your feedback
                shapes what we build next.
              </p>
            </div>
          </div>
        </div>
        {/* Image — right panel */}
        <div className="hidden lg:block w-[45%] relative overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1596558450268-9c27524ba856?w=900&q=85&auto=format&fit=crop"
            alt="Nigerian merchant managing orders on a phone"
            fill
            className="object-cover object-center"
            sizes="45vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-lm-surface via-lm-surface/50 to-transparent" />
        </div>
      </section>

      {/* ── FINAL CTA — split layout ── */}
      <section className="bg-lm-indigo py-20">
        <div className={container}>
          <div className="grid grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-poppins text-[2.5rem] font-black text-white leading-[1.15] mb-5">
                Your first sale is<br />closer than you think.
              </h2>
              <p className="text-[1rem] text-lm-lavender mb-8 max-w-[400px]">
                Set up your store in 5 minutes. No code. No developer. Free for 14 days.
              </p>
              <Link
                href="/onboard"
                className="inline-flex items-center gap-2 bg-lm-lime text-lm-indigo text-[0.96rem] font-bold px-[26px] py-3.5 rounded-[7px] no-underline hover:opacity-90 transition-opacity"
              >
                Launch my free store &rarr;
              </Link>
              <p className="text-[0.86rem] text-lm-muted-dark mt-4">
                Available on Telegram. WhatsApp coming soon.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-10">
              {[
                { value: '5 min', label: 'to set up your store' },
                { value: '24/7', label: 'taking orders while you sleep' },
                { value: '14 days', label: 'free before you pay anything' },
                { value: '₦0', label: 'setup cost, ever' },
              ].map((stat) => (
                <div key={stat.label} className="border-t border-white/15 pt-5">
                  <div className="font-poppins text-[2rem] font-black text-lm-lime leading-none mb-2">
                    {stat.value}
                  </div>
                  <div className="text-[0.84rem] text-lm-lavender leading-[1.5]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
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
          <div className="text-[0.82rem] text-[#4a4870] mt-4 pt-4 border-t border-white/5">
            &copy; 2025 Lameda. All rights reserved. Lagos, Nigeria.
          </div>
        </div>
      </footer>
    </>
  )
}
