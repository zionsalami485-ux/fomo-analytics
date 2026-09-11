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

async function getTokenData() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("CoinGecko request failed");
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("CoinGecko fetch error:", error);

    return null;
  }
}
export default async function TokensPage() {
  const data = await getTokenData();

  if (!data) {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-8 py-10">
      <h1 className="text-4xl font-bold mb-4">
        Token Analytics
      </h1>

      <p className="text-red-400">
        Unable to load live crypto data right now.
      </p>
    </main>
  );
}

  const tokens = [
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

  return (
    <main className="min-h-screen bg-slate-950 text-white px-8 py-10">
      <h1 className="text-4xl font-bold mb-2">
        Token Analytics
      </h1>

      <p className="text-gray-400 mb-8">
        Live crypto prices and market analytics.
      </p>

      <div className="grid gap-5">
        {tokens.map((token) => (
          <div
            key={token.symbol}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between"
          >
            {/* TOKEN NAME AND LOGO */}
            <div className="flex items-center gap-4">
              <img
                src={token.image}
                alt={token.name}
                className="w-10 h-10"
              />

              <div>
                <h2 className="text-xl font-bold">
                  {token.name}
                </h2>

                <p className="text-gray-400">
                  {token.symbol}
                </p>
              </div>
            </div>

            {/* PRICE AND 24H CHANGE */}
            <div>
              <p className="font-semibold">
                ${token.price.toLocaleString()}
              </p>

              <p
                className={
                  token.change >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {token.change.toFixed(2)}%
              </p>
            </div>

            {/* MARKET CAP */}
            <div>
              <p className="text-gray-400 text-sm">
                Market Cap
              </p>

              <p className="font-semibold">
                {formatMarketCap(token.marketCap)}
              </p>
            </div>

            {/* 24H VOLUME */}
            <div>
              <p className="text-gray-400 text-sm">
                24h Volume
              </p>

              <p className="font-semibold">
                {formatMarketCap(token.volume)}
              </p>
            </div>
            <a
  href={`/tokens/${token.id}`}
  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold"
>
  View Details
</a>
          </div>
        ))}
      </div>
    </main>
  );
}