type Props = {
  params: Promise<{
    id: string;
  }>;
};

type PriceData = {
  usd?: number;
  usd_market_cap?: number;
  usd_24h_change?: number;
  usd_24h_vol?: number;
};

const tokenNames: Record<string, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  solana: "Solana",
};

const tokenSymbols: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
};

const tokenImages: Record<string, string> = {
  bitcoin:
    "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",

  ethereum:
    "https://assets.coingecko.com/coins/images/279/large/ethereum.png",

  solana:
    "https://assets.coingecko.com/coins/images/4128/large/solana.png",
};

function formatLargeNumber(value: number) {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  return `$${value.toLocaleString()}`;
}

function formatPrice(value: number) {
  if (value >= 1000) {
    return `$${value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;
  }

  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;
}

export default async function TokenDetailsPage({ params }: Props) {
  const { id } = await params;

  const tokenName = tokenNames[id] || id;
  const tokenSymbol = tokenSymbols[id] || id.toUpperCase();
  const tokenImage = tokenImages[id];

  try {
    // Current market data
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    const tokenData: PriceData | undefined = data[id];

    if (!tokenData || !tokenData.usd) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#020807] text-white">
          <div className="text-center">
            <h1 className="text-3xl font-bold">
              Unable to load token data
            </h1>

            <a
              href="/tokens"
              className="mt-6 inline-block rounded-xl bg-green-400 px-6 py-3 font-bold text-black"
            >
              Back to Tokens
            </a>
          </div>
        </main>
      );
    }

    // Historical 7-day data
    const historyResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=7`,
      {
        cache: "no-store",
      }
    );

    const historyData = await historyResponse.json();

    const prices = historyData.prices || [];

    const firstPrice =
      prices.length > 0 ? prices[0][1] : tokenData.usd;

    const lastPrice =
      prices.length > 0
        ? prices[prices.length - 1][1]
        : tokenData.usd;

    const sevenDayChange =
      firstPrice > 0
        ? ((lastPrice - firstPrice) / firstPrice) * 100
        : 0;

    const marketCap = tokenData.usd_market_cap ?? 0;
    const volume = tokenData.usd_24h_vol ?? 0;
    const twentyFourHourChange =
      tokenData.usd_24h_change ?? 0;

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
              Trackr{" "}
              <span className="text-green-400">
                AI
              </span>
            </h1>

            <div className="flex gap-8 text-gray-300">

              <a
                href="/"
                className="hover:text-green-400"
              >
                Home
              </a>

              <a
                href="/tokens"
                className="text-green-400"
              >
                Tokens
              </a>

              <a
                href="/fumble"
                className="hover:text-green-400"
              >
                Fumble
              </a>

              <a
                href="/wallets"
                className="hover:text-green-400"
              >
                Wallet Analyzer
              </a>

              <a
                href="/leaderboard"
                className="hover:text-green-400"
              >
                Leaderboard
              </a>

            </div>
          </nav>

          {/* Main content */}
          <section className="relative z-10 mx-auto max-w-6xl px-6 py-14">

            {/* Back link */}
            <a
              href="/tokens"
              className="text-sm text-gray-400 transition hover:text-green-400"
            >
              ← Back to Tokens
            </a>

            {/* Token heading */}
            <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

              <div className="flex items-center gap-5">

                {tokenImage && (
                  <img
                    src={tokenImage}
                    alt={tokenName}
                    className="h-20 w-20"
                  />
                )}

                <div>
                  <p className="text-sm tracking-[0.3em] text-green-400">
                    TOKEN DETAILS
                  </p>

                  <h2 className="mt-2 text-4xl font-extrabold md:text-5xl">
                    {tokenName}
                  </h2>

                  <p className="mt-1 text-lg text-gray-400">
                    {tokenSymbol}
                  </p>
                </div>

              </div>

              {/* Current price */}
              <div className="md:text-right">

                <p className="text-sm text-gray-400">
                  Current Price
                </p>

                <p className="mt-2 text-4xl font-bold">
                  {formatPrice(tokenData.usd)}
                </p>

                <p
                  className={
                    twentyFourHourChange >= 0
                      ? "mt-2 font-semibold text-green-400"
                      : "mt-2 font-semibold text-red-400"
                  }
                >
                  {twentyFourHourChange >= 0 ? "+" : ""}
                  {twentyFourHourChange.toFixed(2)}%
                  <span className="ml-2 text-sm text-gray-500">
                    24h
                  </span>
                </p>

              </div>
            </div>

            {/* Market information */}
            <div className="mt-12 grid gap-5 md:grid-cols-3">

              <div className="rounded-2xl border border-green-500/20 bg-black/40 p-6 backdrop-blur-md">

                <p className="text-sm text-gray-400">
                  Market Cap
                </p>

                <p className="mt-3 text-3xl font-bold">
                  {formatLargeNumber(marketCap)}
                </p>

                <p className="mt-2 text-sm text-green-400/70">
                  Total market value
                </p>

              </div>

              <div className="rounded-2xl border border-green-500/20 bg-black/40 p-6 backdrop-blur-md">

                <p className="text-sm text-gray-400">
                  24h Volume
                </p>

                <p className="mt-3 text-3xl font-bold">
                  {formatLargeNumber(volume)}
                </p>

                <p className="mt-2 text-sm text-green-400/70">
                  Trading activity
                </p>

              </div>

              <div className="rounded-2xl border border-green-500/20 bg-black/40 p-6 backdrop-blur-md">

                <p className="text-sm text-gray-400">
                  24h Change
                </p>

                <p
                  className={
                    twentyFourHourChange >= 0
                      ? "mt-3 text-3xl font-bold text-green-400"
                      : "mt-3 text-3xl font-bold text-red-400"
                  }
                >
                  {twentyFourHourChange >= 0 ? "+" : ""}
                  {twentyFourHourChange.toFixed(2)}%
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Price movement
                </p>

              </div>

            </div>

            {/* Historical Performance */}
            <div className="mt-12 rounded-3xl border border-green-500/20 bg-black/40 p-8 backdrop-blur-md">

              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

                <div>
                  <p className="text-sm tracking-[0.3em] text-green-400">
                    HISTORICAL PERFORMANCE
                  </p>

                  <h3 className="mt-3 text-3xl font-bold">
                    Last 7 Days
                  </h3>

                  <p className="mt-2 text-gray-400">
                    See how {tokenName} has performed
                    over the past week.
                  </p>
                </div>

                <div className="md:text-right">

                  <p className="text-sm text-gray-400">
                    7 Day Change
                  </p>

                  <p
                    className={
                      sevenDayChange >= 0
                        ? "mt-2 text-4xl font-bold text-green-400"
                        : "mt-2 text-4xl font-bold text-red-400"
                    }
                  >
                    {sevenDayChange >= 0 ? "+" : ""}
                    {sevenDayChange.toFixed(2)}%
                  </p>

                </div>

              </div>

              {/* Historical stats */}
              <div className="mt-8 grid gap-5 md:grid-cols-2">

                <div className="rounded-2xl border border-green-500/10 bg-[#07100d]/80 p-6">

                  <p className="text-sm text-gray-400">
                    Price 7 Days Ago
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {formatPrice(firstPrice)}
                  </p>

                </div>

                <div className="rounded-2xl border border-green-500/10 bg-[#07100d]/80 p-6">

                  <p className="text-sm text-gray-400">
                    Current Value
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {formatPrice(lastPrice)}
                  </p>

                </div>

              </div>

            </div>

            {/* Fumble teaser */}
            <div className="mt-10 rounded-3xl border border-green-500/20 bg-green-500/5 p-8">

              <p className="text-sm tracking-[0.3em] text-green-400">
                FUMBLE
              </p>

              <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                <div>
                  <h3 className="text-2xl font-bold">
                    What if you bought earlier?
                  </h3>

                  <p className="mt-2 max-w-2xl text-gray-400">
                    Historical investment simulations
                    are coming soon to Trackr AI.
                  </p>
                </div>

                <a
                  href="/fumble"
                  className="rounded-xl border border-green-400 px-6 py-3 text-center font-bold text-green-400 transition hover:bg-green-400 hover:text-black"
                >
                  View Fumble →
                </a>

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
  } catch (error) {
    console.error("Failed to load token:", error);

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020807] text-white">

        <div className="text-center">

          <h1 className="text-3xl font-bold">
            Something went wrong
          </h1>

          <p className="mt-3 text-gray-400">
            Trackr AI could not load this token right now.
          </p>

          <a
            href="/tokens"
            className="mt-6 inline-block rounded-xl bg-green-400 px-6 py-3 font-bold text-black"
          >
            Back to Tokens
          </a>

        </div>

      </main>
    );
  }
}