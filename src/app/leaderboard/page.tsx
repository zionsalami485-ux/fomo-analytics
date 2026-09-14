"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

/* =========================================================
   TYPES
========================================================= */

type Holder = {
  rank: number;
  address: string;
  balance: string;
  balanceRaw: string;
  supplyPercentage: number;
  addressType: "wallet" | "contract";
  isContract: boolean;
  isWhale: boolean;
};

type HolderApiResponse = {
  success: boolean;

  error?: string;

  network?: {
    name: string;
    chainId: number;
  };

  token?: {
    contractAddress: string;
    name: string | null;
    symbol: string | null;
    decimals: number;
    totalSupply: string;
    totalSupplyRaw: string;
  };

  contract?: {
    deploymentBlock: number;
    latestBlock: number;
    contractAgeBlocks: number;
    deploymentSearchChecks: number;
  };

  scan?: {
    chunkSize: number;
    chunksScanned: number;
    blocksScanned: number;
    transferEventsFound: number;
    firstTransferBlock: number | null;
    lastTransferBlock: number | null;
  };

  intelligence?: {
    totalHolders: number;
    top10Concentration: number;
    topHolderPercentage: number;
    whaleCount: number;
    whaleThresholdPercentage: number;
    whaleDefinition: string;
    top20WalletCount: number;
    top20ContractCount: number;
    reconstructedSupply: string;
    reconstructedSupplyPercentage: number;
  };

  topHolders?: Holder[];

  source?: {
    provider: string;
    method: string;
    indexed: boolean;
    fallbackUsed: boolean;
  };

  cache?: {
    generatedAt: string;
    ttlSeconds: number;
  };
};

/* =========================================================
   HELPERS
========================================================= */

function isEvmAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function shortenAddress(address: string) {
  if (!address) return "";

  if (address.length <= 18) {
    return address;
  }

  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value === 0) {
    return "0%";
  }

  if (value < 0.01) {
    return `${value.toFixed(4)}%`;
  }

  return `${value.toFixed(2)}%`;
}

function formatTokenBalance(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  if (number >= 1_000_000_000_000) {
    return `${(number / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toFixed(2)}B`;
  }

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(2)}M`;
  }

  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(2)}K`;
  }

  if (number >= 1) {
    return number.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

function formatNumber(value: number | undefined) {
  if (
    value === undefined ||
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toLocaleString();
}

function formatCacheDuration(seconds: number | undefined) {
  if (!seconds || seconds <= 0) {
    return "—";
  }

  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;

    return `${hours}h`;
  }

  if (seconds % 60 === 0) {
    const minutes = seconds / 60;

    return `${minutes} min`;
  }

  return `${seconds}s`;
}

function formatGeneratedTime(value: string | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* =========================================================
   PAGE
========================================================= */

export default function HolderIntelligencePage() {
  const [tokenAddress, setTokenAddress] = useState("");

  const [searchedToken, setSearchedToken] = useState<
    string | null
  >(null);

  const [data, setData] =
    useState<HolderApiResponse | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  /* =======================================================
     TOKEN SEARCH
  ======================================================= */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanedAddress = tokenAddress
      .trim()
      .toLowerCase();

    setError(null);
    setData(null);
    setSearchedToken(null);

    if (!cleanedAddress) {
      setError(
        "Enter a Robinhood Chain token contract address."
      );

      return;
    }

    if (!isEvmAddress(cleanedAddress)) {
      setError(
        "Enter a valid EVM token contract address."
      );

      return;
    }

    setLoading(true);
    setSearchedToken(cleanedAddress);

    try {
      const response = await fetch(
        `/api/holders?token=${encodeURIComponent(
          cleanedAddress
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as HolderApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to analyze this token."
        );
      }

      setData(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to analyze this token."
      );
    } finally {
      setLoading(false);
    }
  }

  const intelligence = data?.intelligence;
  const token = data?.token;
  const holders = data?.topHolders ?? [];
  const source = data?.source;
  const cache = data?.cache;

  const topHolder = holders[0];

  const top10Concentration =
    intelligence?.top10Concentration ?? 0;

  const top20SupplyShare =
    intelligence?.reconstructedSupplyPercentage ?? 0;

  const concentrationCircleValue = Math.min(
    Math.max(top10Concentration, 0),
    100
  );

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
              className="transition hover:text-white"
            >
              Wallet Analyzer
            </Link>

            <Link
              href="/leaderboard"
              className="text-green-400"
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
            Holder Intelligence
          </div>

          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Know who holds it.

            <span className="block text-green-400">
              Understand the distribution.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            Analyze token ownership on Robinhood Chain,
            identify large holders, measure concentration,
            and investigate the wallets behind the supply.
          </p>
        </div>

        {/* =================================================
            TOKEN SEARCH
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 max-w-4xl"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0e0b]/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={tokenAddress}
                onChange={(event) =>
                  setTokenAddress(event.target.value)
                }
                placeholder="Enter Robinhood Chain token contract address"
                spellCheck={false}
                autoComplete="off"
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-transparent bg-black/40 px-5 py-4 font-mono text-sm text-white outline-none transition placeholder:font-sans placeholder:text-zinc-600 focus:border-green-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-green-400 px-7 py-4 text-sm font-bold text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Analyzing..."
                  : "Analyze Holders"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-600">
            <span>Network:</span>

            <span className="rounded-md border border-green-500/10 bg-green-500/[0.04] px-2 py-1 text-green-400">
              Robinhood Chain
            </span>

            <span>Chain ID 4663</span>

            <span className="text-zinc-800">
              •
            </span>

            <span>Indexed holder data</span>
          </div>
        </form>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="mx-auto mt-7 max-w-4xl rounded-xl border border-green-500/15 bg-green-500/[0.035] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-400/20 border-t-green-400" />

              <div>
                <p className="text-sm font-semibold text-green-300">
                  Analyzing holder distribution
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Fetching indexed Robinhood Chain holder
                  data and calculating concentration metrics.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mx-auto mt-7 max-w-4xl rounded-xl border border-red-500/20 bg-red-500/[0.05] px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}
      </section>

      {/* ===================================================
          DEFAULT STATE
      =================================================== */}

      {!searchedToken && !error && (
        <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.07] bg-[#090c09] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-500/15 bg-green-500/[0.05] font-mono text-xs font-black text-green-400">
                01
              </div>

              <h2 className="mt-5 font-bold">
                Holder Concentration
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                See how much of a token&apos;s supply is
                controlled by its largest holders.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#090c09] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-500/15 bg-green-500/[0.05] font-mono text-xs font-black text-green-400">
                02
              </div>

              <h2 className="mt-5 font-bold">
                Whale Discovery
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Identify significant non-contract wallet
                positions using deterministic holder rules.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#090c09] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-green-500/15 bg-green-500/[0.05] font-mono text-xs font-black text-green-400">
                03
              </div>

              <h2 className="mt-5 font-bold">
                Wallet Intelligence
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Move from a holder directly into Trackr
                Wallet Analyzer to explore what else they
                own.
              </p>
            </div>
          </div>

          {/* ===============================================
              IDLE DATA PANEL
          =============================================== */}

          <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#090c09]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                  Holder Dataset
                </p>

                <p className="mt-1 text-sm font-semibold text-zinc-300">
                  Waiting for token
                </p>
              </div>

              <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Idle
              </span>
            </div>

            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-green-500/15 bg-green-500/[0.04] font-mono text-sm font-black text-green-400">
                HI
              </div>

              <h3 className="mt-5 text-lg font-bold">
                Enter a token contract
              </h3>

              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                Holder Intelligence will analyze indexed
                ownership data for the selected Robinhood
                Chain token.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-zinc-600">
                <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                  Holders
                </span>

                <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                  Concentration
                </span>

                <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                  Wallet Types
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================
          RESULTS
      =================================================== */}

      {searchedToken && data && !loading && (
        <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 lg:px-8">
          {/* =================================================
              TOKEN INFORMATION
          ================================================= */}

          <div className="rounded-2xl border border-white/[0.07] bg-[#090c09] p-5">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                  Analyzed Token
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-black">
                    {token?.name || "Unknown Token"}
                  </h2>

                  {token?.symbol && (
                    <span className="rounded-md border border-green-500/15 bg-green-500/[0.04] px-2 py-1 text-xs font-bold text-green-400">
                      {token.symbol}
                    </span>
                  )}
                </div>

                <p className="mt-3 break-all font-mono text-xs text-zinc-500">
                  {searchedToken}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="w-fit rounded-full border border-green-500/20 bg-green-500/[0.05] px-4 py-2 text-xs font-semibold text-green-400">
                  Robinhood Chain
                </div>

                {source?.indexed && (
                  <div className="w-fit rounded-full border border-green-500/10 bg-green-500/[0.035] px-4 py-2 text-xs font-semibold text-green-400">
                    Indexed Data
                  </div>
                )}

                <div className="w-fit rounded-full border border-white/[0.07] bg-white/[0.025] px-4 py-2 text-xs font-semibold text-zinc-400">
                  Supply{" "}
                  {token
                    ? formatTokenBalance(
                        token.totalSupply
                      )
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              INTELLIGENCE SUMMARY
          ================================================= */}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.07] bg-[#090c09] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
                Total Holders
              </p>

              <p className="mt-3 text-2xl font-black">
                {intelligence
                  ? intelligence.totalHolders.toLocaleString()
                  : "—"}
              </p>

              <p className="mt-2 text-xs text-zinc-600">
                Indexed holder addresses
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#090c09] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
                Top 10 Share
              </p>

              <p className="mt-3 text-2xl font-black">
                {intelligence
                  ? formatPercentage(
                      intelligence.top10Concentration
                    )
                  : "—"}
              </p>

              <p className="mt-2 text-xs text-zinc-600">
                Supply held by largest 10
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#090c09] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
                Top Holder
              </p>

              <p className="mt-3 text-2xl font-black">
                {intelligence
                  ? formatPercentage(
                      intelligence.topHolderPercentage
                    )
                  : "—"}
              </p>

              <p className="mt-2 text-xs capitalize text-zinc-600">
                {topHolder
                  ? topHolder.addressType
                  : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#090c09] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
                Whale Wallets
              </p>

              <p className="mt-3 text-2xl font-black">
                {intelligence?.whaleCount ?? "—"}
              </p>

              <p className="mt-2 text-xs text-zinc-600">
                Wallets holding ≥{" "}
                {intelligence?.whaleThresholdPercentage ??
                  1}
                %
              </p>
            </div>
          </div>

          {/* =================================================
              CONCENTRATION + HOLDERS
          ================================================= */}

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.75fr]">
            {/* ===============================================
                CONCENTRATION
            =============================================== */}

            <div className="rounded-2xl border border-white/[0.07] bg-[#090c09] p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-green-400">
                Concentration
              </p>

              <h2 className="mt-2 text-xl font-black">
                Supply Distribution
              </h2>

              <div className="mt-8 flex min-h-[220px] items-center justify-center">
                <div
                  className="relative flex h-44 w-44 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(
                      #4ade80 0% ${concentrationCircleValue}%,
                      rgba(255,255,255,0.05) ${concentrationCircleValue}% 100%
                    )`,
                  }}
                >
                  <div className="flex h-[132px] w-[132px] items-center justify-center rounded-full bg-[#090c09]">
                    <div className="text-center">
                      <p className="text-2xl font-black">
                        {formatPercentage(
                          top10Concentration
                        )}
                      </p>

                      <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">
                        Top 10 Share
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    Top 20 wallets
                  </span>

                  <span className="font-semibold text-zinc-300">
                    {intelligence?.top20WalletCount ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    Top 20 contracts
                  </span>

                  <span className="font-semibold text-zinc-300">
                    {intelligence?.top20ContractCount ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    Top 20 supply share
                  </span>

                  <span className="font-semibold text-green-400">
                    {intelligence
                      ? formatPercentage(
                          top20SupplyShare
                        )
                      : "—"}
                  </span>
                </div>
              </div>

              <p className="mt-5 text-xs leading-5 text-zinc-600">
                Concentration includes both wallets and
                contracts because both can hold and control
                token supply.
              </p>
            </div>

            {/* ===============================================
                HOLDER TABLE
            =============================================== */}

            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#090c09]">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-green-400">
                    Holder Rankings
                  </p>

                  <h2 className="mt-1 text-lg font-black">
                    Top Holders
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {source?.indexed && (
                    <span className="hidden rounded-md border border-green-500/10 bg-green-500/[0.035] px-3 py-1.5 text-[10px] uppercase tracking-wider text-green-400 sm:inline-flex">
                      Indexed
                    </span>
                  )}

                  <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-600">
                    Top 20
                  </span>
                </div>
              </div>

              <div className="hidden grid-cols-[55px_1.45fr_90px_1fr_90px] border-b border-white/[0.06] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600 md:grid">
                <p>Rank</p>
                <p>Holder</p>
                <p>Type</p>
                <p>Balance</p>

                <p className="text-right">
                  Supply
                </p>
              </div>

              {holders.length > 0 ? (
                <div>
                  {holders.map((holder) => {
                    const holderContent = (
                      <>
                        <div className="font-mono text-xs font-bold text-zinc-600 md:text-sm">
                          #{holder.rank}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs font-semibold text-zinc-300 transition group-hover:text-green-400 sm:text-sm">
                            {shortenAddress(
                              holder.address
                            )}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2 md:hidden">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                holder.addressType ===
                                "contract"
                                  ? "border-zinc-700 bg-zinc-800/30 text-zinc-500"
                                  : "border-green-500/15 bg-green-500/[0.04] text-green-400"
                              }`}
                            >
                              {holder.addressType}
                            </span>

                            {holder.isWhale && (
                              <span className="rounded-md border border-green-500/20 bg-green-500/[0.07] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-400">
                                Whale
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="hidden md:block">
                          <span
                            className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
                              holder.addressType ===
                              "contract"
                                ? "border-zinc-700 bg-zinc-800/30 text-zinc-500"
                                : "border-green-500/15 bg-green-500/[0.04] text-green-400"
                            }`}
                          >
                            {holder.addressType}
                          </span>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-zinc-300">
                            {formatTokenBalance(
                              holder.balance
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-700">
                            {token?.symbol || "TOKEN"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold">
                            {formatPercentage(
                              holder.supplyPercentage
                            )}
                          </p>

                          {holder.isWhale && (
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-green-400">
                              Whale
                            </p>
                          )}
                        </div>
                      </>
                    );

                    if (
                      holder.addressType === "wallet"
                    ) {
                      return (
                        <Link
                          key={holder.address}
                          href={`/wallets?address=${encodeURIComponent(
                            holder.address
                          )}`}
                          className="group grid grid-cols-[45px_1fr_100px] items-center gap-3 border-b border-white/[0.045] px-5 py-4 transition last:border-b-0 hover:bg-green-500/[0.025] md:grid-cols-[55px_1.45fr_90px_1fr_90px]"
                        >
                          {holderContent}
                        </Link>
                      );
                    }

                    return (
                      <div
                        key={holder.address}
                        className="group grid grid-cols-[45px_1fr_100px] items-center gap-3 border-b border-white/[0.045] px-5 py-4 last:border-b-0 md:grid-cols-[55px_1.45fr_90px_1fr_90px]"
                      >
                        {holderContent}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[330px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] font-mono text-xs font-bold text-zinc-500">
                    00
                  </div>

                  <h3 className="mt-4 font-bold">
                    No holders found
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                    No indexed positive holder balances were
                    returned for this token.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* =================================================
              DATASET DETAILS
          ================================================= */}

          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                  Dataset Details
                </p>

                <p className="mt-1 text-xs text-zinc-700">
                  Current indexing and retrieval information
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />

                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Indexed
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* DATA SOURCE */}

              <div className="rounded-xl border border-white/[0.06] bg-[#090c09] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Data Source
                </p>

                <p className="mt-2 text-sm font-bold text-green-400">
                  {source?.provider || "Blockscout"}
                </p>

                <p className="mt-1 text-[10px] text-zinc-700">
                  {source?.indexed
                    ? "Indexed holder data"
                    : source?.method ||
                      "Holder data"}
                </p>
              </div>

              {/* TRANSFERS */}

              <div className="rounded-xl border border-white/[0.06] bg-[#090c09] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Transfer Count
                </p>

                <p className="mt-2 font-mono text-sm font-bold text-zinc-300">
                  {formatNumber(
                    data.scan?.transferEventsFound
                  )}
                </p>

                <p className="mt-1 text-[10px] text-zinc-700">
                  Indexed token transfers
                </p>
              </div>

              {/* LATEST BLOCK */}

              <div className="rounded-xl border border-white/[0.06] bg-[#090c09] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Latest Block
                </p>

                <p className="mt-2 font-mono text-sm font-bold text-zinc-300">
                  {data.contract?.latestBlock
                    ? formatNumber(
                        data.contract.latestBlock
                      )
                    : "—"}
                </p>

                <p className="mt-1 text-[10px] text-zinc-700">
                  Robinhood Chain
                </p>
              </div>

              {/* CACHE */}

              <div className="rounded-xl border border-white/[0.06] bg-[#090c09] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Cache Window
                </p>

                <p className="mt-2 text-sm font-bold text-zinc-300">
                  {formatCacheDuration(
                    cache?.ttlSeconds
                  )}
                </p>

                <p className="mt-1 text-[10px] text-zinc-700">
                  Generated{" "}
                  {formatGeneratedTime(
                    cache?.generatedAt
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              DATA SOURCE NOTICE
          ================================================= */}

          <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#080b08] px-5 py-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Holder Index
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Holder rankings use indexed Robinhood
                  Chain data rather than scanning the
                  token&apos;s full transfer history on every
                  request.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="rounded-md border border-green-500/10 bg-green-500/[0.035] px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-green-400">
                  {source?.provider || "Blockscout"}
                </span>

                <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Alchemy RPC
                </span>
              </div>
            </div>
          </div>

          {/* =================================================
              HOLDER → WALLET ANALYZER FLOW
          ================================================= */}

          <div className="mt-5 rounded-2xl border border-green-500/10 bg-green-500/[0.025] p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-400">
              Holder Investigation
            </p>

            <h3 className="mt-3 text-xl font-black">
              From token holder to wallet intelligence.
            </h3>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              Wallet addresses in the ranking are clickable.
              Open one to inspect its multi-chain holdings
              inside Trackr AI Wallet Analyzer.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 text-zinc-400">
                Token
              </span>

              <span className="text-zinc-700">
                →
              </span>

              <span className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 text-zinc-400">
                Holder
              </span>

              <span className="text-zinc-700">
                →
              </span>

              <span className="rounded-lg border border-green-500/10 bg-green-500/[0.04] px-3 py-2 text-green-400">
                Wallet Analyzer
              </span>
            </div>
          </div>

          {/* =================================================
              CONTRACT REFERENCE
          ================================================= */}

          <div className="mt-5 text-center">
            <p className="text-xs text-zinc-700">
              Selected contract:{" "}
              <span className="font-mono text-zinc-500">
                {shortenAddress(searchedToken)}
              </span>
            </p>
          </div>
        </section>
      )}
    </main>
  );
}