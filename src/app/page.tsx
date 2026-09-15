export default function Home() {
  return (
    <main className="min-h-screen bg-[#020807] text-white overflow-hidden">
      {/* Background effects */}
      <div className="relative min-h-screen">

        {/* Green glow blobs */}
        <div className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-green-500/20 blur-[120px]" />
        <div className="absolute top-40 -right-40 h-[420px] w-[420px] rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[700px] -translate-x-1/2 rounded-full bg-green-500/10 blur-[100px]" />

        {/* Grid */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "linear-gradient(rgba(34,197,94,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.08) 1px, transparent 1px)",
              backgroundSize: "45px 45px",
            }}
          />
        </div>

        {/* Navbar */}
<nav className="relative z-20 flex flex-col items-center justify-center gap-4 border-b border-green-900/40 px-4 py-5 backdrop-blur-md md:flex-row md:gap-10 lg:gap-20 lg:px-10">
  <h1 className="text-2xl font-bold whitespace-nowrap">
    Trackr <span className="text-green-400">AI</span>
  </h1>

  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm text-gray-300 sm:text-base md:gap-x-7">
    <a href="/" className="whitespace-nowrap hover:text-green-400">
      Home
    </a>

    <a href="/tokens" className="whitespace-nowrap hover:text-green-400">
      Tokens
    </a>

    <a href="/fumble" className="whitespace-nowrap hover:text-green-400">
      Fumble
    </a>

    <a href="/wallets" className="whitespace-nowrap hover:text-green-400">
      Wallet Analyzer
    </a>

    <a
      href="/leaderboard"
      className="whitespace-nowrap hover:text-green-400"
    >
      Holder Intelligence
    </a>
  </div>
</nav>

        {/* Floating Bitcoin card */}
        <div className="absolute left-10 top-56 hidden rotate-[-6deg] rounded-2xl border border-green-500/30 bg-black/40 p-6 backdrop-blur-md lg:block">
          <p className="text-sm text-gray-400">Bitcoin</p>
          <p className="mt-1 text-2xl font-bold">$77,605</p>
          <p className="mt-2 text-green-400">▲ +0.92%</p>
        </div>

        {/* Floating Ethereum card */}
        <div className="absolute right-10 top-56 hidden rotate-[6deg] rounded-2xl border border-green-500/30 bg-black/40 p-6 backdrop-blur-md lg:block">
          <p className="text-sm text-gray-400">Ethereum</p>
          <p className="mt-1 text-2xl font-bold">$2,563</p>
          <p className="mt-2 text-green-400">▲ +5.23%</p>
        </div>

        {/* Hero */}
        <section className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
          <p className="mb-5 text-sm tracking-[0.35em] text-gray-400">
            LOOK BACK. SEE THE GAINS. RANK THE HOLDERS.
          </p>

          <h2 className="text-5xl font-extrabold md:text-7xl">
            Trackr <span className="text-green-400">AI</span>
          </h2>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-gray-300 md:text-xl">
            Track crypto tokens, analyze wallets, discover top holders, and
            uncover smarter market insights.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/tokens"
              className="rounded-xl bg-green-400 px-8 py-4 font-bold text-black transition hover:bg-green-300"
            >
              Get Started →
            </a>

            <a
              href="/tokens"
              className="rounded-xl border border-green-400 px-8 py-4 font-bold text-white transition hover:bg-green-400/10"
            >
              Explore Tokens
            </a>
          </div>

          <p className="mt-10 text-sm tracking-[0.3em] text-green-400/60">
            SAME DATA. SMARTER INSIGHTS.
          </p>
        </section>

        {/* Bottom neon terrain effect */}
        <div className="absolute bottom-0 left-0 right-0 h-48 overflow-hidden">
          <div className="absolute bottom-0 h-px w-full bg-green-400 shadow-[0_0_40px_10px_rgba(34,197,94,0.6)]" />

          <div className="absolute bottom-0 left-0 h-32 w-1/3 rotate-[-6deg] border-t border-green-400/50" />
          <div className="absolute bottom-0 left-1/4 h-24 w-1/3 rotate-[4deg] border-t border-green-400/40" />
          <div className="absolute bottom-0 right-0 h-36 w-1/3 rotate-[6deg] border-t border-green-400/50" />
          <div className="absolute bottom-0 right-1/4 h-20 w-1/3 rotate-[-4deg] border-t border-green-400/40" />
        </div>
      </div>
    </main>
  );
}