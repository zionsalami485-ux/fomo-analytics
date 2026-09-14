type TokenData = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  marketCap: number;
  change: number;
  volume: number;
};

function formatMarketCap(value: number) {
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

async function getTokenData(): Promise<TokenData[] | null> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true",
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    return [
      {
        id: "bitcoin",
        name: "Bitcoin",
        symbol: "BTC",
        image:
          "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
        price: data.bitcoin.usd,
        marketCap: data.bitcoin.usd_market_cap,
        change: data.bitcoin.usd_24h_change,
        volume: data.bitcoin.usd_24h_vol,
      },
      {
        id: "ethereum",
        name: "Ethereum",
        symbol: "ETH",
        image:
          "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
        price: data.ethereum.usd,
        marketCap: data.ethereum.usd_market_cap,
        change: data.ethereum.usd_24h_change,
        volume: data.ethereum.usd_24h_vol,
      },
      {
        id: "solana",
        name: "Solana",
        symbol: "SOL",
        image:
          "https://assets.coingecko.com/coins/images/4128/large/solana.png",
        price: data.solana.usd,
        marketCap: data.solana.usd_market_cap,
        change: data.solana.usd_24h_change,
        volume: data.solana.usd_24h_vol,
      },
    ];
  } catch (error) {
    console.error("Failed to fetch token data:", error);
    return null;
  }
}

export default async function TokensPage() {
  const tokens = await getTokenData();

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

            <a href="/tokens" className="text-green-400">
              Tokens
            </a>

            <a href="/fumble" className="hover:text-green-400">
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

        {/* Content */}
        <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
          <div className="mb-12 text-center">
            <p className="text-sm tracking-[0.35em] text-green-400/70">
              LIVE MARKET DATA
            </p>

            <h2 className="mt-3 text-4xl font-extrabold md:text-5xl">
              Token <span className="text-green-400">Analytics</span>
            </h2>

            <p className="mt-4 text-gray-400">
              Live crypto prices, market activity, and token insights.
            </p>
          </div>

          {!tokens ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
              Unable to load live crypto data right now.
            </div>
          ) : (
            <div className="space-y-5">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="group flex flex-col gap-6 rounded-2xl border border-green-500/20 bg-black/40 p-6 backdrop-blur-md transition hover:border-green-400/50 hover:bg-green-500/5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={token.image}
                      alt={token.name}
                      className="h-14 w-14"
                    />

                    <div>
                      <h3 className="text-2xl font-bold">{token.name}</h3>
                      <p className="text-gray-400">{token.symbol}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-2xl font-bold">
                      ${token.price.toLocaleString()}
                    </p>

                    <p
                      className={
                        token.change >= 0
                          ? "mt-1 font-semibold text-green-400"
                          : "mt-1 font-semibold text-red-400"
                      }
                    >
                      {token.change >= 0 ? "+" : ""}
                      {token.change.toFixed(2)}%
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400">Market Cap</p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatMarketCap(token.marketCap)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400">24h Volume</p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatMarketCap(token.volume)}
                    </p>
                  </div>

                  <a
                    href={`/tokens/${token.id}`}
                    className="rounded-xl border border-green-400 bg-green-400 px-5 py-3 text-center font-bold text-black transition hover:bg-green-300"
                  >
                    View Details
                  </a>
                </div>
              ))}
            </div>
          )}
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