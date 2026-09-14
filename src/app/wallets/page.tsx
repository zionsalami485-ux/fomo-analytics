"use client";

import { FormEvent, useState } from "react";

type WalletToken = {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
  balance: number;
  rawBalance: string;
};

type WalletResult = {
  success: boolean;
  address: string;
  network: string;
  balance: number;
  symbol: string;
  tokenCount: number;
  tokens: WalletToken[];
};

export default function WalletAnalyzerPage() {
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<WalletResult | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const wallet = address.trim();

    if (!wallet) {
      setMessage("Enter a wallet address first.");
      setWalletData(null);
      return;
    }

    const isValidEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(wallet);

    if (!isValidEvmAddress) {
      setMessage("Please enter a valid Ethereum wallet address.");
      setWalletData(null);
      return;
    }

    setLoading(true);
    setMessage("Analyzing wallet...");
    setWalletData(null);

    try {
      const response = await fetch(
        `/api/wallet?address=${encodeURIComponent(wallet)}`
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to analyze wallet.");
        return;
      }

      setWalletData(data);
      setMessage("Wallet analysis complete.");
    } catch (error) {
      console.error("Wallet analysis error:", error);

      setMessage("Something went wrong while analyzing the wallet.");
    } finally {
      setLoading(false);
    }
  }

  function formatBalance(balance: number) {
    if (balance === 0) {
      return "0";
    }

    if (balance < 0.000001) {
      return balance.toExponential(6);
    }

    if (balance < 1) {
      return balance.toLocaleString(undefined, {
        maximumFractionDigits: 10,
      });
    }

    return balance.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
  }

  function shortenAddress(value: string) {
    return `${value.slice(0, 8)}...${value.slice(-6)}`;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#020807] text-white">
      <div className="relative min-h-screen">
        {/* Background glows */}
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-green-500/20 blur-[120px]" />

        <div className="absolute -right-40 top-40 h-[420px] w-[420px] rounded-full bg-emerald-500/20 blur-[120px]" />

        <div className="absolute bottom-0 left-1/2 h-[300px] w-[700px] -translate-x-1/2 rounded-full bg-green-500/10 blur-[100px]" />

        {/* Grid background */}
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

            <a href="/wallets" className="text-green-400">
              Wallet Analyzer
            </a>

            <a href="/leaderboard" className="hover:text-green-400">
              Leaderboard
            </a>
          </div>
        </nav>

        {/* Main content */}
        <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
          {/* Heading */}
          <div className="text-center">
            <p className="text-sm tracking-[0.35em] text-green-400/70">
              WALLET INTELLIGENCE
            </p>

            <h2 className="mt-4 text-4xl font-extrabold md:text-6xl">
              Wallet <span className="text-green-400">Analyzer</span>
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-400">
              Enter an Ethereum wallet address to explore balances, token
              holdings, and blockchain insights.
            </p>
          </div>

          {/* Search card */}
          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-green-500/30 bg-black/40 p-7 backdrop-blur-md md:p-10">
            <div className="mb-5">
              <p className="font-semibold text-white">Wallet Address</p>

              <p className="mt-1 text-sm text-gray-500">
                Ethereum Mainnet wallets supported.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 md:flex-row"
            >
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setMessage("");
                  setWalletData(null);
                }}
                placeholder="0x..."
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-green-500/20 bg-[#07100d] px-5 py-4 text-white outline-none transition placeholder:text-gray-600 focus:border-green-400 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-green-400 px-7 py-4 font-bold text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Analyzing..." : "Analyze Wallet →"}
              </button>
            </form>

            {message && (
              <p
                className={`mt-4 text-sm ${
                  message === "Wallet analysis complete."
                    ? "text-green-400"
                    : message === "Analyzing wallet..."
                      ? "text-gray-300"
                      : "text-yellow-300"
                }`}
              >
                {message}
              </p>
            )}

            {walletData && (
              <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <p className="text-sm text-gray-400">Ethereum Balance</p>

                <p className="mt-1 text-xl font-bold text-green-400">
                  {formatBalance(walletData.balance)} {walletData.symbol}
                </p>
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {/* Native balance */}
            <div className="rounded-2xl border border-green-500/20 bg-black/30 p-6 backdrop-blur-md">
              <div className="text-3xl">💰</div>

              <p className="mt-4 text-sm text-gray-400">Native Balance</p>

              <p
                className={`mt-2 break-words text-2xl font-bold ${
                  walletData ? "text-green-400" : "text-gray-500"
                }`}
              >
                {walletData
                  ? `${formatBalance(walletData.balance)} ${walletData.symbol}`
                  : "—"}
              </p>

              <p className="mt-3 text-sm text-gray-600">
                Ethereum Mainnet
              </p>
            </div>

            {/* Token holdings */}
            <div className="rounded-2xl border border-green-500/20 bg-black/30 p-6 backdrop-blur-md">
              <div className="text-3xl">🪙</div>

              <p className="mt-4 text-sm text-gray-400">Token Holdings</p>

              <p
                className={`mt-2 text-2xl font-bold ${
                  walletData ? "text-green-400" : "text-gray-500"
                }`}
              >
                {walletData ? walletData.tokenCount : "—"}
              </p>

              <p className="mt-3 text-sm text-gray-600">
                ERC-20 assets with a non-zero balance
              </p>
            </div>

            {/* Wallet activity */}
            <div className="rounded-2xl border border-green-500/20 bg-black/30 p-6 backdrop-blur-md">
              <div className="text-3xl">📊</div>

              <p className="mt-4 text-sm text-gray-400">Wallet Activity</p>

              <p className="mt-2 text-2xl font-bold text-gray-500">—</p>

              <p className="mt-3 text-sm text-gray-600">
                Transaction history coming next
              </p>
            </div>
          </div>

          {/* Token holdings section */}
          {walletData && walletData.tokens.length > 0 && (
            <div className="mt-10 rounded-3xl border border-green-500/20 bg-black/30 p-6 backdrop-blur-md md:p-8">
              <div>
                <p className="text-sm tracking-[0.3em] text-green-400">
                  TOKEN HOLDINGS
                </p>

                <h3 className="mt-3 text-2xl font-bold">
                  Assets inside this wallet
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Live ERC-20 balances from Ethereum Mainnet.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {walletData.tokens.map((token) => (
                  <div
                    key={token.contractAddress}
                    className="flex flex-col gap-5 rounded-2xl border border-green-500/15 bg-[#07100d] p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      {token.logo ? (
                        <img
                          src={token.logo}
                          alt={`${token.symbol} logo`}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-lg font-bold text-green-400">
                          {token.symbol?.slice(0, 1) || "?"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-white">
                            {token.name}
                          </p>

                          <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-400">
                            {token.symbol}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-gray-600">
                          {shortenAddress(token.contractAddress)}
                        </p>
                      </div>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        Balance
                      </p>

                      <p className="mt-1 text-xl font-bold text-green-400">
                        {formatBalance(token.balance)} {token.symbol}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty token state */}
          {walletData && walletData.tokens.length === 0 && (
            <div className="mt-10 rounded-3xl border border-green-500/15 bg-black/30 p-8 text-center backdrop-blur-md">
              <div className="text-4xl">🪙</div>

              <h3 className="mt-4 text-xl font-bold">
                No ERC-20 holdings detected
              </h3>

              <p className="mt-2 text-gray-500">
                This Ethereum wallet currently has no non-zero ERC-20 balances
                detected by Trackr AI.
              </p>
            </div>
          )}

          {/* Wallet details */}
          {walletData && (
            <div className="mt-8 rounded-3xl border border-green-500/20 bg-black/30 p-8 backdrop-blur-md">
              <p className="text-sm tracking-[0.3em] text-green-400">
                WALLET DETAILS
              </p>

              <h3 className="mt-3 text-2xl font-bold">Analysis Result</h3>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-green-500/10 bg-[#07100d] p-4">
                  <p className="text-sm text-gray-500">Wallet Address</p>

                  <p className="mt-1 break-all text-sm text-gray-300">
                    {walletData.address}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-green-500/10 bg-[#07100d] p-4">
                    <p className="text-sm text-gray-500">Network</p>

                    <p className="mt-1 font-semibold text-white">
                      {walletData.network || "Ethereum Mainnet"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-green-500/10 bg-[#07100d] p-4">
                    <p className="text-sm text-gray-500">
                      ERC-20 Holdings
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {walletData.tokenCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Future insights */}
          <div className="mt-12 rounded-3xl border border-green-500/20 bg-green-500/5 p-8">
            <p className="text-sm tracking-[0.3em] text-green-400">
              TRACKR WALLET INSIGHTS
            </p>

            <h3 className="mt-3 text-2xl font-bold">
              Understand what&apos;s inside a wallet.
            </h3>

            <div className="mt-6 grid gap-4 text-gray-400 md:grid-cols-2">
              <p className="text-green-300">✓ Native coin balance</p>

              <p className="text-green-300">✓ Token holdings</p>

              <p>○ Portfolio value</p>

              <p>○ Recent transactions</p>

              <p>○ Asset distribution</p>

              <p>○ Wallet activity</p>
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