export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Lameda</h1>
        <p className="mt-3 text-lg text-zinc-500">
          AI-powered commerce bot for Nigerian merchants — Telegram-first, WhatsApp-ready
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/onboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Get started →
          </a>
          <a
            href="/api/health"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-zinc-700 text-sm font-medium rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            API status
          </a>
        </div>
      </div>
    </div>
  )
}
