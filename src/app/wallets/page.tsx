"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* =========================================================
   TYPES
========================================================= */

type WalletToken = {
  contractAddress: string | null;
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  network: string;
  networkName: string;
  isNative: boolean;
  isSuspicious?: boolean;
  suspiciousReason?: string | null;
};

type ChainGroup = {
  network: string;
  name: string;
  totalValueUsd: number;
  tokenCount: number;
  tokens: WalletToken[];
};

type WalletResult = {
  success: boolean;
  address: string;
  addressType: "evm" | "solana";
  totalPortfolioValueUsd: number;
  chainCount: number;
  tokenCount: number;
  chains: ChainGroup[];
  tokens: WalletToken[];
  suspiciousTokenCount?: number;
  suspiciousTokens?: WalletToken[];
  partialErrors?: unknown[];
};

/* =========================================================
   ADDRESS VALIDATION
========================================================= */

function isEvmAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isSolanaAddress(address: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/* =========================================================
   FORMATTERS
========================================================= */

function formatBalance(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value === 0) return "0";

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 100_000) {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  }

  if (value >= 1) {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 10,
    });
  }

  if (value >= 0.000001) {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 10,
    });
  }

  return value.toExponential(6);
}

function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "$0.00";

  if (value > 0 && value < 0.01) {
    return "< $0.01";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTokenPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "—";
  }

  if (value >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (value >= 0.01) {
    return `$${value.toFixed(4)}`;
  }

  if (value >= 0.000001) {
    return `$${value.toFixed(8)}`;
  }

  return `$${value.toExponential(4)}`;
}

function shortenAddress(address: string) {
  if (!address) return "";

  if (address.length <= 18) {
    return address;
  }

  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function getChainShortName(network: string) {
  switch (network) {
    case "eth-mainnet":
      return "ETH";

    case "sol-mainnet":
      return "SOL";

    case "base-mainnet":
      return "BASE";

    case "arb-mainnet":
      return "ARB";

    case "opt-mainnet":
      return "OP";

    case "matic-mainnet":
    case "polygon-mainnet":
      return "POL";

    case "bnb-mainnet":
      return "BNB";

    case "robinhood-mainnet":
      return "RHC";

    default:
      return "NET";
  }
}

function getTokenLetter(token: WalletToken) {
  const symbol =
    token.symbol?.trim() ||
    token.name?.trim() ||
    "?";

  return symbol.slice(0, 1).toUpperCase();
}

/* =========================================================
   PAGE
========================================================= */

export default function WalletAnalyzerPage() {
  const [address, setAddress] = useState("");

  const [result, setResult] =
    useState<WalletResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [statusMessage, setStatusMessage] =
    useState<string | null>(null);

  const [showSuspicious, setShowSuspicious] =
    useState(false);

  const [tokenSearch, setTokenSearch] = useState("");
  const [chainFilter, setChainFilter] = useState("all");
  const [sortBy, setSortBy] = useState("value-desc");

  const autoScanStarted = useRef(false);

  /* =======================================================
     ANALYZE WALLET
     Shared by manual search and Holder Intelligence links
  ======================================================= */

  async function analyzeWallet(walletAddress: string) {
    const cleanedAddress = walletAddress.trim();

    setError(null);
    setResult(null);
    setShowSuspicious(false);

    if (!cleanedAddress) {
      setError("Enter a wallet address to continue.");
      return;
    }

    const evm = isEvmAddress(cleanedAddress);
    const solana = isSolanaAddress(cleanedAddress);

    if (!evm && !solana) {
      setError(
        "Enter a valid EVM or Solana wallet address."
      );
      return;
    }

    setAddress(cleanedAddress);

    if (evm) {
      setStatusMessage(
        "Scanning wallet across supported EVM chains..."
      );
    } else {
      setStatusMessage(
        "Scanning Solana wallet..."
      );
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/wallet?address=${encodeURIComponent(
          cleanedAddress
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to analyze this wallet."
        );
      }

      setResult(data);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to analyze this wallet.";

      setError(message);
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  }

  /* =======================================================
     MANUAL SEARCH
  ======================================================= */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    await analyzeWallet(address);
  }

  /* =======================================================
     HOLDER INTELLIGENCE -> WALLET ANALYZER
  ======================================================= */

  useEffect(() => {
    if (autoScanStarted.current) {
      return;
    }

    const searchParams = new URLSearchParams(
      window.location.search
    );

    const incomingAddress = searchParams
      .get("address")
      ?.trim();

    if (!incomingAddress) {
      return;
    }

    autoScanStarted.current = true;
    setAddress(incomingAddress);
    void analyzeWallet(incomingAddress);
  }, []);

  const availableChains = useMemo(() => result?.chains ?? [], [result]);

  const filteredChains = useMemo(() => {
    if (!result) return [];

    const query = tokenSearch.trim().toLowerCase();

    return result.chains
      .filter((chain) => chainFilter === "all" || chain.network === chainFilter)
      .map((chain) => {
        const tokens = chain.tokens
          .filter((token) => {
            if (!query) return true;

            return (
              token.name.toLowerCase().includes(query) ||
              token.symbol.toLowerCase().includes(query) ||
              (token.contractAddress ?? "").toLowerCase().includes(query)
            );
          })
          .sort((a, b) => {
            switch (sortBy) {
              case "value-asc":
                return a.valueUsd - b.valueUsd;
              case "balance-desc":
                return b.balance - a.balance;
              case "balance-asc":
                return a.balance - b.balance;
              case "name-asc":
                return a.name.localeCompare(b.name);
              case "value-desc":
              default:
                return b.valueUsd - a.valueUsd;
            }
          });

        return { ...chain, tokens };
      })
      .filter((chain) => chain.tokens.length > 0);
  }, [result, tokenSearch, chainFilter, sortBy]);

  return (
    <main className="min-h-screen bg-[#050705] text-white">
      {/* ===================================================
          BACKGROUND
      =================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.035)_1px,transparent_1px)] bg-[size:42px_42px]" />

        <div className="absolute left-1/2 top-[-220px] h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-green-500/[0.035] blur-[120px]" />
      </div>

      {/* ===================================================
          NAVBAR
      =================================================== */}

      <header className="relative z-20 border-b border-white/[0.06] bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tight"
          >
            Trackr{" "}
            <span className="text-green-400">
              AI
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
            <Link
              href="/"
              className="transition hover:text-white"
            >
              Home
            </Link>

            <Link
              href="/tokens"
              className="transition hover:text-white"
            >
              Tokens
            </Link>

            <Link
              href="/fumble"
              className="transition hover:text-white"
            >
              Fumble
            </Link>

            <Link
              href="/wallets"
              className="text-green-400"
            >
              Wallet Analyzer
            </Link>

            <Link
              href="/leaderboard"
              className="transition hover:text-white"
            >
              Holder Intelligence
            </Link>
          </nav>
        </div>
      </header>

      {/* ===================================================
          HERO
      =================================================== */}

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-10 pt-16 lg:px-8 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex rounded-full border border-green-500/20 bg-green-500/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-green-400">
            Trackr Wallet Intelligence
          </div>

          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Analyze a wallet.

            <span className="block text-green-400">
              See what it actually holds.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            Scan EVM wallets across supported
            networks or analyze Solana wallets for
            native SOL and SPL token holdings.
          </p>
        </div>

        {/* =================================================
            SEARCH BOX
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 max-w-4xl"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0e0b]/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={address}
                onChange={(event) =>
                  setAddress(event.target.value)
                }
                placeholder="0x... or Solana address"
                spellCheck={false}
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-transparent bg-black/40 px-5 py-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-green-500/30"
              />

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-green-400 px-7 py-4 text-sm font-bold text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Analyzing..."
                  : "Analyze Wallet"}
              </button>
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-zinc-600">
            Read-only analysis. Trackr AI never
            requests your private key or seed phrase.
          </p>
        </form>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="mx-auto mt-8 max-w-4xl rounded-xl border border-green-500/10 bg-green-500/[0.03] px-5 py-4 text-center text-sm text-green-300">
            {statusMessage ||
              "Analyzing wallet..."}
          </div>
        )}

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mx-auto mt-8 max-w-4xl rounded-xl border border-red-500/20 bg-red-500/[0.05] px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}
      </section>

      {/* ===================================================
          RESULTS
      =================================================== */}

      {result && (
        <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 lg:px-8">
          {/* =================================================
              WALLET INFORMATION
          ================================================= */}

          <div className="mb-6 rounded-2xl border border-white/[0.07] bg-[#0a0d0a]/90 p-5 backdrop-blur-xl">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                  Analyzed Wallet
                </p>

                <p className="mt-2 break-all font-mono text-sm text-zinc-300">
                  {result.address}
                </p>

              </div>

              <div className="w-fit shrink-0 rounded-full border border-green-500/20 bg-green-500/[0.07] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-green-400">
                {result.addressType === "solana"
                  ? "Solana Wallet"
                  : "EVM Wallet"}
              </div>
            </div>
          </div>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0d0a] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Portfolio Value
              </p>

              <p className="mt-3 text-3xl font-black tracking-tight">
                {formatUsd(
                  result.totalPortfolioValueUsd
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0d0a] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Networks
              </p>

              <p className="mt-3 text-3xl font-black tracking-tight">
                {result.chainCount}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0d0a] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Assets
              </p>

              <p className="mt-3 text-3xl font-black tracking-tight">
                {result.tokenCount}
              </p>
            </div>
          </div>

          {/* =================================================
              SUSPICIOUS ASSETS NOTICE
          ================================================= */}

          {!!result.suspiciousTokenCount &&
            result.suspiciousTokenCount > 0 && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-amber-400/15 bg-amber-400/[0.035]">
                <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-amber-200">
                        Suspicious assets hidden
                      </p>

                      <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        {result.suspiciousTokenCount}{" "}
                        hidden
                      </span>
                    </div>

                    <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
                      These assets contain metadata
                      patterns commonly associated with
                      unsolicited claim links, rewards,
                      vouchers, or promotional spam. They
                      are excluded from the main portfolio
                      totals.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowSuspicious(
                        (current) => !current
                      )
                    }
                    className="w-fit shrink-0 rounded-lg border border-white/[0.08] bg-black/30 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-amber-400/20 hover:text-white"
                  >
                    {showSuspicious
                      ? "Hide assets"
                      : "Review hidden assets"}
                  </button>
                </div>

                {/* ===========================================
                    SUSPICIOUS TOKEN LIST
                =========================================== */}

                {showSuspicious &&
                  result.suspiciousTokens &&
                  result.suspiciousTokens.length >
                    0 && (
                    <div className="border-t border-amber-400/10 px-5 py-4">
                      <div className="space-y-3">
                        {result.suspiciousTokens.map(
                          (token, index) => (
                            <div
                              key={`suspicious-${token.network}-${token.contractAddress}-${index}`}
                              className="rounded-xl border border-white/[0.05] bg-black/20 p-4"
                            >
                              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/15 bg-amber-400/[0.05] text-xs font-bold text-amber-300">
                                    {getTokenLetter(
                                      token
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-zinc-300">
                                      {token.name}
                                    </p>

                                    <p className="mt-1 truncate text-xs text-zinc-600">
                                      {token.symbol}
                                      {" · "}
                                      {token.networkName}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-left md:text-right">
                                  <p className="text-xs text-amber-300/80">
                                    Flagged metadata
                                  </p>

                                  <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-600">
                                    {token.suspiciousReason ||
                                      "Suspicious metadata pattern detected"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      <p className="mt-4 text-xs leading-5 text-zinc-600">
                        Trackr AI uses metadata signals
                        to reduce portfolio spam. A hidden
                        asset is not automatically proof
                        that a token is malicious.
                      </p>
                    </div>
                  )}
              </div>
            )}

          {/* =================================================
              PORTFOLIO CONTROLS
          ================================================= */}

          <div className="mt-8 rounded-2xl border border-white/[0.07] bg-[#0a0d0a] p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
              <input
                type="text"
                value={tokenSearch}
                onChange={(event) => setTokenSearch(event.target.value)}
                placeholder="Search token name, symbol, or contract"
                className="min-w-0 rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-green-500/30"
              />

              <select
                value={chainFilter}
                onChange={(event) => setChainFilter(event.target.value)}
                className="rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-green-500/30"
              >
                <option value="all">All chains</option>
                {availableChains.map((chain) => (
                  <option key={chain.network} value={chain.network}>
                    {chain.name}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-green-500/30"
              >
                <option value="value-desc">Value: high to low</option>
                <option value="value-asc">Value: low to high</option>
                <option value="balance-desc">Amount: high to low</option>
                <option value="balance-asc">Amount: low to high</option>
                <option value="name-asc">Token: A to Z</option>
              </select>
            </div>
          </div>

          {/* =================================================
              CHAINS
          ================================================= */}

          <div className="mt-6 space-y-6">
            {filteredChains.map((chain) => (
              <div
                key={chain.network}
                className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#090c09]"
              >
                {/* ===========================================
                    CHAIN HEADER
                =========================================== */}

                <div className="flex flex-col justify-between gap-5 border-b border-white/[0.06] px-5 py-5 sm:flex-row sm:items-center lg:px-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-green-500/15 bg-green-500/[0.055] px-3 text-xs font-black text-green-400">
                      {getChainShortName(
                        chain.network
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                        Network
                      </p>

                      <h2 className="mt-1 text-lg font-bold">
                        {chain.name}
                      </h2>
                    </div>
                  </div>

                  <div className="flex gap-8">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                        Portfolio Value
                      </p>

                      <p className="mt-1 text-sm font-bold">
                        {formatUsd(
                          chain.tokens.reduce(
                            (total, token) => total + token.valueUsd,
                            0
                          )
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                        Assets
                      </p>

                      <p className="mt-1 text-sm font-bold">
                        {chain.tokens.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ===========================================
                    TOKEN LIST
                =========================================== */}

                <div className="divide-y divide-white/[0.055]">
                  {chain.tokens.map(
                    (token, index) => (
                      <div
                        key={`${chain.network}-${token.contractAddress ?? "native"}-${index}`}
                        className="grid gap-5 px-5 py-5 transition hover:bg-white/[0.015] lg:grid-cols-[minmax(0,1.5fr)_minmax(140px,.65fr)_minmax(120px,.55fr)_minmax(120px,.55fr)] lg:items-center lg:px-6"
                      >
                        {/* ===================================
                            TOKEN IDENTITY
                        =================================== */}

                        <div className="flex min-w-0 items-center gap-4">
                          {token.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={token.logo}
                              alt={`${token.symbol} logo`}
                              className="h-11 w-11 shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.03] object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm font-black text-zinc-300">
                              {getTokenLetter(
                                token
                              )}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-zinc-100">
                                {token.name}
                              </p>

                              {token.isNative && (
                                <span className="rounded-md border border-green-500/15 bg-green-500/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-400">
                                  Native
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs font-medium text-zinc-500">
                              {token.symbol}
                            </p>

                            {token.isNative ? (
                              <p className="mt-2 text-[11px] text-zinc-600">
                                Native network asset
                              </p>
                            ) : token.contractAddress ? (
                              <p className="mt-2 font-mono text-[11px] text-zinc-600">
                                {shortenAddress(
                                  token.contractAddress
                                )}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* ===================================
                            BALANCE
                        =================================== */}

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
                            Balance
                          </p>

                          <p className="mt-2 break-words text-sm font-medium text-zinc-200">
                            {formatBalance(
                              token.balance
                            )}{" "}
                            {token.symbol}
                          </p>
                        </div>

                        {/* ===================================
                            PRICE
                        =================================== */}

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
                            Price
                          </p>

                          <p className="mt-2 text-sm font-medium text-zinc-200">
                            {token.priceUsd > 0
                              ? formatTokenPrice(
                                  token.priceUsd
                                )
                              : "—"}
                          </p>
                        </div>

                        {/* ===================================
                            VALUE
                        =================================== */}

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
                            Value
                          </p>

                          <p className="mt-2 text-sm font-bold text-white">
                            {token.priceUsd > 0
                              ? formatUsd(
                                  token.valueUsd
                                )
                              : "—"}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          {result.chains.length > 0 && filteredChains.length === 0 && (
            <div className="mt-6 rounded-2xl border border-white/[0.07] bg-[#090c09] px-6 py-12 text-center">
              <p className="text-lg font-bold">No matching assets</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                Try another token search or select a different chain.
              </p>
            </div>
          )}

          {/* =================================================
              EMPTY PORTFOLIO
          ================================================= */}

          {result.chains.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/[0.07] bg-[#090c09] px-6 py-14 text-center">
              <p className="text-lg font-bold">
                No visible portfolio assets
              </p>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                Trackr AI did not find normal token
                balances on the currently supported
                networks for this wallet.
              </p>
            </div>
          )}

          {/* =================================================
              MULTI-CHAIN INFO
          ================================================= */}

          <div className="mt-10 rounded-2xl border border-green-500/10 bg-green-500/[0.025] p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-400">
              Trackr Multi-Chain
            </p>

            <h3 className="mt-3 text-xl font-black">
              One analyzer. Multiple networks.
            </h3>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              Trackr AI supports EVM wallets across
              multiple chains and Solana wallets with
              native SOL and SPL token holdings.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "Ethereum",
                "Solana",
                "Base",
                "Arbitrum",
                "Optimism",
                "Polygon",
                "BNB Chain",
                "Robinhood Chain",
              ].map((network) => (
                <span
                  key={network}
                  className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 text-xs text-zinc-400"
                >
                  {network}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}