"use client";

import { useState } from "react";

export default function LeaderboardPage() {
  const [token, setToken] = useState("ethereum");

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

            <a href="/fumble" className="hover:text-green-400">
              Fumble
            </a>

            <a href="/wallets" className="hover:text-green-400">
              Wallet Analyzer
            </a>

            <a href="/leaderboard" className="text-green-400">
              Leaderboard
            </a>
          </div>
        </nav>

        {/* Main content */}
        <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
          {/* Heading */}
          <div className="text-center">
            <p className="text-sm tracking-[0.35em] text-green-400/70">
              HOLDER INTELLIGENCE
            </p>

            <h2 className="mt-4 text-4xl font-extrabold md:text-6xl">
              Holder <span className="text-green-400">Leaderboard</span>
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-400">
              Discover the biggest holders and analyze token concentration
              across the market.
            </p>
          </div>

          {/* Token selector */}
          <div className="mx-auto mt-10 max-w-xl">
            <label className="mb-3 block text-sm font-semibold text-gray-300">
              Select Token
            </label>

            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-xl border border-green-500/30 bg-[#07100d] px-5 py-4 text-white outline-none focus:border-green-400"
            >
              <option value="ethereum">Ethereum</option>
              <option value="bitcoin">Bitcoin</option>
              <option value="solana">Solana</option>
            </select>
          </div>

          {/* Top holder preview cards */}
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-yellow-500/30 bg-black/40 p-7 text-center backdrop-blur-md">
              <div className="text-4xl">🥇</div>

              <p className="mt-4 text-sm text-gray-400">
                #1 Holder
              </p>

              <p className="mt-2 text-xl font-bold">
                —
              </p>

              <p className="mt-2 text-green-400">
                Awaiting live data
              </p>
            </div>

            <div className="rounded-2xl border border-gray-400/30 bg-black/40 p-7 text-center backdrop-blur-md">
              <div className="text-4xl">🥈</div>

              <p className="mt-4 text-sm text-gray-400">
                #2 Holder
              </p>

              <p className="mt-2 text-xl font-bold">
                —
              </p>

              <p className="mt-2 text-green-400">
                Awaiting live data
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/30 bg-black/40 p-7 text-center backdrop-blur-md">
              <div className="text-4xl">🥉</div>

              <p className="mt-4 text-sm text-gray-400">
                #3 Holder
              </p>

              <p className="mt-2 text-xl font-bold">
                —
              </p>

              <p className="mt-2 text-green-400">
                Awaiting live data
              </p>
            </div>
          </div>

          {/* Leaderboard table */}
          <div className="mt-10 overflow-hidden rounded-3xl border border-green-500/20 bg-black/40 backdrop-blur-md">
            <div className="grid grid-cols-4 border-b border-green-500/20 px-6 py-5 text-sm text-gray-400">
              <p>Rank</p>
              <p>Wallet</p>
              <p>Holdings</p>
              <p className="text-right">Share</p>
            </div>

            {/* Empty state */}
            <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
              <div className="text-4xl">🏆</div>

              <h3 className="mt-4 text-xl font-bold">
                Live Holder Data
              </h3>

              <p className="mt-2 max-w-lg text-gray-400">
                Trackr AI will display verified wallet rankings and holder
                concentration here once the blockchain data connection is
                enabled.
              </p>

              <p className="mt-4 text-sm text-green-400">
                Selected: {token.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Insight cards */}
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
              <p className="text-sm text-gray-400">
                Top 10 Concentration
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-500">
                —
              </p>
            </div>

            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
              <p className="text-sm text-gray-400">
                Total Holders
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-500">
                —
              </p>
            </div>

            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
              <p className="text-sm text-gray-400">
                Whale Wallets
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-500">
                —
              </p>
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