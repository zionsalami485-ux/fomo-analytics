import FomoCalculator from "./FomoCalculator";

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

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TokenDetailsPage({ params }: Props) {
  const { id } = await params;
  const tokenNames: Record<string, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  solana: "Solana",
};

const tokenName = tokenNames[id] || id;
const response = await fetch(
  `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
  {
    cache: "no-store",
  }
);

const data = await response.json();

const tokenData = data[id];

if (!tokenData) {
  return (
    <main className="min-h-screen bg-black text-white p-10">
      Unable to load token data right now.
    </main>
  );
}

const historyResponse = await fetch(
  `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=7`,
  {
    cache: "no-store",
  }
);

const historyData = await historyResponse.json();
console.log(historyData.prices);
const firstPrice = historyData.prices[0][1];
const lastPrice = historyData.prices[historyData.prices.length - 1][1];
const sevenDayChange = ((lastPrice - firstPrice) / firstPrice) * 100;


  return (
    <main className="min-h-screen bg-slate-950 text-white px-8 py-10">
      <h1 className="text-4xl font-bold mb-4">
        Token Details
      </h1>

      <p className="text-gray-400">
        You are viewing: {tokenName}
      </p>

      <p className="text-2xl font-semibold mt-4">
        ${tokenData.usd.toLocaleString()}
      </p>

      <p
     className={
        tokenData.usd_24h_change >= 0
      ? "text-green-400 mt-2"
      : "text-red-400 mt-2"
        }
        >
         {tokenData.usd_24h_change.toFixed(2)}%
        </p>

        <p className="text-gray-400 mt-6">
        Market Cap
        </p>

        <p className="text-xl font-semibold">
         {formatMarketCap(tokenData.usd_market_cap)}
        </p>

        <p className="text-gray-400 mt-6">
         24h Volume
        </p>

        <p className="text-xl font-semibold">
         {formatMarketCap(tokenData.usd_24h_vol)}
        </p>

        <h2 className="text-2xl font-bold mt-10">
         Historical Performance
        </h2>

        <p className="text-gray-400 mt-2">
         See how {tokenName} has performed over time.
        </p>

        <p
         className={
             sevenDayChange >= 0
                ? "text-green-400 mt-4 text-xl font-semibold"
                : "text-red-400 mt-4 text-xl font-semibold"
            }
        >
            7 Day Change: {sevenDayChange.toFixed(2)}%
        </p>

        <p className="text-gray-400 mt-3">
            Price 7 days ago: ${firstPrice.toFixed(2)}
        </p>

        <h3 className="text-xl font-bold mt-8">
        🔥 FOMO Fumble
        </h3>

        <FomoCalculator
            firstPrice={firstPrice}
            lastPrice={lastPrice}
        />

       

    </main>
  );
}