export default function FumblePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020807] text-white">
      <div className="relative min-h-screen">
        {/* Background glow */}
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-green-500/20 blur-[120px]" />

        <div className="absolute -right-40 top-40 h-[420px] w-[420px] rounded-full bg-emerald-500/20 blur-[120px]" />

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
        <nav className="relative z-20 flex items-center justify-center gap-20 border-b border-green-900/40 px-10 py-6 backdrop-blur-md">
          <h1 className="text-2xl font-bold">
            Trackr <span className="text-green-400">AI</span>
          </h1>

          <div className="flex gap-8 text-gray-300">
            <a href="/" className="hover:text-green-400">
              Home
            </a>

            <a href="/tokens" className="hover:text-green-400">
              Tokens
            </a>

            <a href="/fumble" className="text-green-400">
              Fumble
            </a>

            <a href="/wallets" className="hover:text-green-400">
              Wallet Analyzer
            </a>

            <a href="/leaderboard" className="hover:text-green-400">
              Leaderboard
            </a>
          </div>
        </nav>

        {/* Main content */}
        <section className="relative z-10 flex min-h-[80vh] items-center justify-center px-6">
          <div className="w-full max-w-3xl text-center">
            <p className="text-sm tracking-[0.35em] text-green-400/70">
              FUMBLE
            </p>

            <h2 className="mt-4 text-5xl font-extrabold md:text-7xl">
              You Could&apos;ve
              <span className="block text-green-400">Made More.</span>
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
              Fumble will show you what your investment could have been worth
              if you bought earlier.
            </p>

            {/* Coming soon card */}
            <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-green-500/30 bg-black/40 p-10 backdrop-blur-md">
              <div className="text-5xl">💀</div>

              <h3 className="mt-5 text-3xl font-bold">
                Fumble is{" "}
                <span className="text-green-400">Coming Soon</span>
              </h3>

              <p className="mt-4 text-gray-400">
                Historical investment comparisons, gain calculations, and
                shareable fumble results are currently being built.
              </p>

              <div className="mt-8 flex justify-center">
                <a
                  href="/tokens"
                  className="rounded-xl border border-green-400 bg-green-400 px-7 py-3 font-bold text-black transition hover:bg-green-300"
                >
                  Explore Tokens →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom glow */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-36 overflow-hidden">
          <div className="absolute bottom-0 h-px w-full bg-green-400 shadow-[0_0_40px_10px_rgba(34,197,94,0.6)]" />

          <div className="absolute bottom-0 left-0 h-24 w-1/3 rotate-[-5deg] border-t border-green-400/40" />

          <div className="absolute bottom-0 right-0 h-24 w-1/3 rotate-[5deg] border-t border-green-400/40" />
        </div>
      </div>
    </main>
  );
}