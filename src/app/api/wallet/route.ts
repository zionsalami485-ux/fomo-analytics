import { NextRequest, NextResponse } from "next/server";

/* =========================================================
   TYPES
========================================================= */

type PortfolioToken = {
  address: string;
  network: string;
  tokenAddress: string | null;
  tokenBalance: string;

  tokenMetadata?: {
    decimals?: number;
    logo?: string | null;
    name?: string;
    symbol?: string;
  };

  tokenPrices?: {
    currency: string;
    value: string;
    lastUpdatedAt?: string;
  }[];
};

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

type SolanaTokenAccount = {
  pubkey: string;

  account?: {
    data?: {
      parsed?: {
        info?: {
          mint?: string;

          tokenAmount?: {
            amount?: string;
            decimals?: number;
            uiAmount?: number | null;
            uiAmountString?: string;
          };
        };
      };
    };
  };
};

type DexScreenerPair = {
  chainId?: string;
  dexId?: string;

  baseToken?: {
    address?: string;
    name?: string;
    symbol?: string;
  };

  quoteToken?: {
    address?: string;
    name?: string;
    symbol?: string;
  };

  priceUsd?: string | null;

  liquidity?: {
    usd?: number | null;
  } | null;
};

/* =========================================================
   NETWORK NAMES
========================================================= */

const NETWORK_NAMES: Record<string, string> = {
  "eth-mainnet": "Ethereum",
  "base-mainnet": "Base",
  "arb-mainnet": "Arbitrum",
  "opt-mainnet": "Optimism",
  "matic-mainnet": "Polygon",
  "polygon-mainnet": "Polygon",
  "bnb-mainnet": "BNB Chain",
  "robinhood-mainnet": "Robinhood Chain",
  "sol-mainnet": "Solana",
};

/* =========================================================
   ADDRESS DETECTION
========================================================= */

function isEvmAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isSolanaAddress(address: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/* =========================================================
   BALANCE HELPERS
========================================================= */

function rawBalanceToNumber(
  rawBalance: string | null | undefined,
  decimals: number
) {
  if (!rawBalance) {
    return 0;
  }

  try {
    const raw = BigInt(rawBalance);

    if (raw === BigInt(0)) {
      return 0;
    }

    return Number(raw) / 10 ** decimals;
  } catch {
    return 0;
  }
}

/* =========================================================
   SUSPICIOUS TOKEN DETECTION

   IMPORTANT:

   This is intentionally conservative.

   We DO NOT mark a token suspicious simply because:
   - it has no price
   - it has low liquidity
   - we do not recognize it
   - its symbol is unusual

   Instead, we look for strong scam-like metadata patterns
   such as URLs, Telegram links, "visit to claim", vouchers,
   fake rewards, etc.

   The classifier uses a score so one harmless word is less
   likely to incorrectly hide a legitimate token.
========================================================= */

function classifySuspiciousToken(
  token: WalletToken
): {
  isSuspicious: boolean;
  reason: string | null;
} {
  /*
    Native assets should never be classified by
    name/symbol heuristics.
  */

  if (token.isNative) {
    return {
      isSuspicious: false,
      reason: null,
    };
  }

  const name =
    token.name?.trim() ?? "";

  const symbol =
    token.symbol?.trim() ?? "";

  const combined =
    `${name} ${symbol}`.toLowerCase();

  let score = 0;

  const reasons: string[] = [];

  /* =====================================================
     STRONG TELEGRAM / SOCIAL CLAIM SIGNALS
  ===================================================== */

  if (
    /t\.me\/|telegram\s*@|telegram\.me\//i.test(
      combined
    )
  ) {
    score += 4;

    reasons.push(
      "Telegram link in token metadata"
    );
  }

  /* =====================================================
     WEBSITE / DOMAIN INSIDE TOKEN NAME OR SYMBOL

     Examples:
     www.fomox.club
     cex.lat
     fli.so/shiba

     Contract metadata normally should not be used as
     an unsolicited promotional URL.
  ===================================================== */

  const hasWebsite =
    /https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|io|xyz|club|top|site|lat|so)\b/i.test(
      combined
    );

  if (hasWebsite) {
    score += 2;

    reasons.push(
      "Promotional website in token metadata"
    );
  }

  /* =====================================================
     CLAIM LANGUAGE
  ===================================================== */

  if (
    /\bclaim\b|\bclaimable\b|visit\s+to\s+claim|claim\s+now/i.test(
      combined
    )
  ) {
    score += 3;

    reasons.push(
      "Claim-style token metadata"
    );
  }

  /* =====================================================
     VOUCHER LANGUAGE
  ===================================================== */

  if (
    /\bvoucher\b/i.test(
      combined
    )
  ) {
    score += 2;

    reasons.push(
      "Voucher-style token metadata"
    );
  }

  /* =====================================================
     UNSOLICITED REWARD LANGUAGE
  ===================================================== */

  if (
    /reward\s+inside|reward\s+at|free\s+reward|airdrop\s+reward/i.test(
      combined
    )
  ) {
    score += 3;

    reasons.push(
      "Unsolicited reward-style metadata"
    );
  }

  /* =====================================================
     GIFT / PRIZE LANGUAGE

     Kept weaker by itself. A legitimate project could
     theoretically contain the word "gift".

     Combined with a URL/reward/claim signal it crosses
     our threshold.
  ===================================================== */

  if (
    /\bgift\b|\bprize\b/i.test(
      combined
    )
  ) {
    score += 1;

    reasons.push(
      "Gift or prize language"
    );
  }

  /* =====================================================
     SWAP / REDEEM INSTRUCTION + WEBSITE

     Example:
     "Swap your Voucher on fli.so/shiba"
  ===================================================== */

  if (
    /\bswap\s+your\b|\bredeem\b/i.test(
      combined
    )
  ) {
    score += 2;

    reasons.push(
      "Unsolicited redemption instruction"
    );
  }

  /* =====================================================
     TOKEN DISTRIBUTION + CLAIM / LINK STYLE
  ===================================================== */

  if (
    /token\s+distribution/i.test(
      combined
    )
  ) {
    score += 1;

    reasons.push(
      "Unsolicited token distribution language"
    );
  }

  /*
    Threshold = 3.

    Examples:

    www.fomox.club
      URL = 2
      Reward inside = 3
      Total = 5 → suspicious

    "5000$Gift / Reward at cex.lat"
      Gift = 1
      Reward = 3
      URL = 2
      Total = 6 → suspicious

    "SHIBA VOUCHER / Swap your Voucher..."
      Voucher = 2
      Swap instruction = 2
      URL = 2
      Total = 6 → suspicious

    An unknown token with no price:
      Total = 0 → NOT automatically suspicious.
  */

  const isSuspicious =
    score >= 3;

  return {
    isSuspicious,

    reason: isSuspicious
      ? reasons.join(" · ")
      : null,
  };
}

/* =========================================================
   APPLY SUSPICIOUS CLASSIFICATION
========================================================= */

function classifyTokens(
  tokens: WalletToken[]
): WalletToken[] {
  return tokens.map((token) => {
    const classification =
      classifySuspiciousToken(token);

    return {
      ...token,

      isSuspicious:
        classification.isSuspicious,

      suspiciousReason:
        classification.reason,
    };
  });
}

/* =========================================================
   COINGECKO PRICE
========================================================= */

async function getCoinGeckoPrice(
  coinId: string
): Promise<number> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return 0;
    }

    const data =
      await response.json();

    return Number(
      data?.[coinId]?.usd ?? 0
    );
  } catch (error) {
    console.error(
      `Unable to fetch ${coinId} price:`,
      error
    );

    return 0;
  }
}

/* =========================================================
   ALCHEMY TOKEN PRICES BY ADDRESS
========================================================= */

async function getTokenPricesByAddress(
  apiKey: string,
  network: string,
  addresses: string[]
): Promise<Map<string, number>> {
  const prices =
    new Map<string, number>();

  if (addresses.length === 0) {
    return prices;
  }

  const chunkSize = 25;

  for (
    let i = 0;
    i < addresses.length;
    i += chunkSize
  ) {
    const chunk =
      addresses.slice(
        i,
        i + chunkSize
      );

    try {
      const response =
        await fetch(
          `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-address`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                addresses:
                  chunk.map(
                    (address) => ({
                      network,
                      address,
                    })
                  ),
              }),

            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          `Alchemy Prices API error for ${network}:`,
          data
        );

        continue;
      }

      const results =
        Array.isArray(data?.data)
          ? data.data
          : [];

      for (
        const token of results
      ) {
        if (!token?.address) {
          continue;
        }

        const usdPrice =
          token.prices?.find(
            (price: {
              currency?: string;
              value?: string;
            }) =>
              price.currency?.toLowerCase() ===
              "usd"
          );

        const value =
          Number(
            usdPrice?.value ??
              0
          );

        if (
          Number.isFinite(
            value
          ) &&
          value > 0
        ) {
          const key =
            token.address.startsWith(
              "0x"
            )
              ? token.address.toLowerCase()
              : token.address;

          prices.set(
            key,
            value
          );
        }
      }
    } catch (error) {
      console.error(
        `Unable to fetch Alchemy token prices for ${network}:`,
        error
      );
    }
  }

  return prices;
}

/* =========================================================
   DEXSCREENER SOLANA PRICE FALLBACK
========================================================= */

async function getDexScreenerSolanaPrices(
  addresses: string[]
): Promise<Map<string, number>> {
  const prices =
    new Map<string, number>();

  if (addresses.length === 0) {
    return prices;
  }

  const chunkSize = 30;

  for (
    let i = 0;
    i < addresses.length;
    i += chunkSize
  ) {
    const chunk =
      addresses.slice(
        i,
        i + chunkSize
      );

    try {
      const addressList =
        chunk.join(",");

      const response =
        await fetch(
          `https://api.dexscreener.com/tokens/v1/solana/${addressList}`,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",
            },

            cache:
              "no-store",
          }
        );

      if (!response.ok) {
        console.error(
          "DexScreener API error:",
          response.status,
          response.statusText
        );

        continue;
      }

      const data =
        await response.json();

      const pairs:
        DexScreenerPair[] =
        Array.isArray(data)
          ? data
          : [];

      const bestLiquidity =
        new Map<
          string,
          number
        >();

      for (
        const pair of pairs
      ) {
        if (
          pair?.chainId !==
          "solana"
        ) {
          continue;
        }

        const tokenAddress =
          pair?.baseToken
            ?.address;

        if (!tokenAddress) {
          continue;
        }

        if (
          !chunk.includes(
            tokenAddress
          )
        ) {
          continue;
        }

        const priceUsd =
          Number(
            pair?.priceUsd ??
              0
          );

        if (
          !Number.isFinite(
            priceUsd
          ) ||
          priceUsd <= 0
        ) {
          continue;
        }

        const liquidityUsd =
          Number(
            pair?.liquidity
              ?.usd ?? 0
          );

        const previousLiquidity =
          bestLiquidity.get(
            tokenAddress
          ) ?? -1;

        if (
          liquidityUsd >
          previousLiquidity
        ) {
          bestLiquidity.set(
            tokenAddress,
            liquidityUsd
          );

          prices.set(
            tokenAddress,
            priceUsd
          );
        }
      }
    } catch (error) {
      console.error(
        "Unable to fetch DexScreener prices:",
        error
      );
    }
  }

  return prices;
}

/* =========================================================
   ALCHEMY PORTFOLIO API
========================================================= */

async function getPortfolioTokens(
  apiKey: string,
  address: string,
  networks: string[]
): Promise<{
  tokens: WalletToken[];
  partialErrors: unknown[];
}> {
  const url =
    `https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/by-address`;

  const response =
    await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        addresses: [
          {
            address,
            networks,
          },
        ],

        withMetadata: true,
        withPrices: true,

        includeNativeTokens: true,
        includeErc20Tokens: true,

        includeBlockMetadata:
          false,
      }),

      cache: "no-store",
    });

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "Alchemy Portfolio API error:",
      data
    );

    throw new Error(
      data?.error?.message ||
        "Alchemy Portfolio API request failed"
    );
  }

  const portfolioTokens:
    PortfolioToken[] =
    data?.data?.tokens ??
    [];

  const formattedTokens:
    WalletToken[] =
    portfolioTokens
      .map((token) => {
        const metadata =
          token.tokenMetadata ??
          {};

        const decimals =
          typeof metadata.decimals ===
          "number"
            ? metadata.decimals
            : 18;

        const balance =
          rawBalanceToNumber(
            token.tokenBalance,
            decimals
          );

        const usdPrice =
          token.tokenPrices?.find(
            (price) =>
              price.currency.toLowerCase() ===
              "usd"
          );

        const priceUsd =
          usdPrice
            ? Number(
                usdPrice.value
              )
            : 0;

        const safePrice =
          Number.isFinite(
            priceUsd
          )
            ? priceUsd
            : 0;

        const valueUsd =
          balance *
          safePrice;

        const isNative =
          token.tokenAddress ===
          null;

        let name =
          metadata.name ??
          "Unknown Token";

        let symbol =
          metadata.symbol ??
          "UNKNOWN";

        if (isNative) {
          switch (
            token.network
          ) {
            case "eth-mainnet":
            case "base-mainnet":
            case "arb-mainnet":
            case "opt-mainnet":
              name =
                "Ethereum";
              symbol = "ETH";
              break;

            case "matic-mainnet":
            case "polygon-mainnet":
              name =
                "Polygon";
              symbol = "POL";
              break;
          }
        }

        return {
          contractAddress:
            token.tokenAddress ??
            null,

          name,

          symbol,

          decimals,

          logo:
            metadata.logo ??
            null,

          balance,

          priceUsd:
            safePrice,

          valueUsd,

          network:
            token.network,

          networkName:
            NETWORK_NAMES[
              token.network
            ] ??
            token.network,

          isNative,
        };
      })
      .filter(
        (token) =>
          Number.isFinite(
            token.balance
          ) &&
          token.balance > 0
      );

  return {
    tokens:
      formattedTokens,

    partialErrors:
      data?.error
        ?.partialErrors ??
      [],
  };
}

/* =========================================================
   RPC EVM CHAIN SCANNER
========================================================= */

async function getRpcChainTokens({
  apiKey,
  rpcUrl,
  address,
  network,
  networkName,
  nativeName,
  nativeSymbol,
  nativeDecimals,
  nativePriceUsd,
}: {
  apiKey: string;
  rpcUrl: string;
  address: string;
  network: string;
  networkName: string;
  nativeName: string;
  nativeSymbol: string;
  nativeDecimals: number;
  nativePriceUsd: number;
}): Promise<WalletToken[]> {
  const tokens:
    WalletToken[] = [];

  /* =====================================================
     NATIVE BALANCE
  ===================================================== */

  try {
    const nativeResponse =
      await fetch(
        rpcUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,

              method:
                "eth_getBalance",

              params: [
                address,
                "latest",
              ],
            }),

          cache:
            "no-store",
        }
      );

    const nativeData =
      await nativeResponse.json();

    if (
      !nativeData.error &&
      nativeData.result
    ) {
      const balance =
        rawBalanceToNumber(
          nativeData.result,
          nativeDecimals
        );

      if (balance > 0) {
        tokens.push({
          contractAddress:
            null,

          name:
            nativeName,

          symbol:
            nativeSymbol,

          decimals:
            nativeDecimals,

          logo: null,

          balance,

          priceUsd:
            nativePriceUsd,

          valueUsd:
            balance *
            nativePriceUsd,

          network,

          networkName,

          isNative: true,
        });
      }
    }
  } catch (error) {
    console.error(
      `${networkName} native balance error:`,
      error
    );
  }

  /* =====================================================
     ERC-20 BALANCES
  ===================================================== */

  try {
    const tokenResponse =
      await fetch(
        rpcUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              jsonrpc:
                "2.0",

              id: 2,

              method:
                "alchemy_getTokenBalances",

              params: [
                address,
                "erc20",
              ],
            }),

          cache:
            "no-store",
        }
      );

    const tokenData =
      await tokenResponse.json();

    if (
      tokenData.error ||
      !tokenData?.result
        ?.tokenBalances
    ) {
      console.error(
        `${networkName} token balance error:`,
        tokenData?.error
      );

      return tokens;
    }

    const nonZeroTokens =
      tokenData.result
        .tokenBalances
        .filter(
          (token: {
            contractAddress:
              string;
            tokenBalance:
              | string
              | null;
          }) => {
            if (
              !token.tokenBalance
            ) {
              return false;
            }

            try {
              return (
                BigInt(
                  token.tokenBalance
                ) > BigInt(0)
              );
            } catch {
              return false;
            }
          }
        );

    const enrichedTokens =
      await Promise.all(
        nonZeroTokens.map(
          async (token: {
            contractAddress:
              string;
            tokenBalance:
              string;
          }) => {
            try {
              const metadataResponse =
                await fetch(
                  rpcUrl,
                  {
                    method:
                      "POST",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body:
                      JSON.stringify(
                        {
                          jsonrpc:
                            "2.0",

                          id: 3,

                          method:
                            "alchemy_getTokenMetadata",

                          params: [
                            token.contractAddress,
                          ],
                        }
                      ),

                    cache:
                      "no-store",
                  }
                );

              const metadataData =
                await metadataResponse.json();

              const metadata =
                metadataData
                  ?.result ??
                {};

              const decimals =
                typeof metadata.decimals ===
                "number"
                  ? metadata.decimals
                  : 18;

              const balance =
                rawBalanceToNumber(
                  token.tokenBalance,
                  decimals
                );

              if (
                !Number.isFinite(
                  balance
                ) ||
                balance <= 0
              ) {
                return null;
              }

              const walletToken:
                WalletToken =
                {
                  contractAddress:
                    token.contractAddress,

                  name:
                    metadata.name ??
                    "Unknown Token",

                  symbol:
                    metadata.symbol ??
                    "UNKNOWN",

                  decimals,

                  logo:
                    metadata.logo ??
                    null,

                  balance,

                  priceUsd: 0,

                  valueUsd: 0,

                  network,

                  networkName,

                  isNative:
                    false,
                };

              return walletToken;
            } catch (
              error
            ) {
              console.error(
                `${networkName} metadata error:`,
                error
              );

              return null;
            }
          }
        )
      );

    const validTokens =
      enrichedTokens.filter(
        (
          token
        ): token is WalletToken =>
          token !== null
      );

    /* =====================================================
       PRICE ERC-20 TOKENS USING CONTRACT ADDRESS
    ===================================================== */

    const contractAddresses =
      validTokens
        .map(
          (token) =>
            token.contractAddress
        )
        .filter(
          (
            contractAddress
          ): contractAddress is string =>
            contractAddress !==
            null
        );

    const tokenPrices =
      await getTokenPricesByAddress(
        apiKey,
        network,
        contractAddresses
      );

    for (
      const token of validTokens
    ) {
      if (
        !token.contractAddress
      ) {
        continue;
      }

      const contractKey =
        token.contractAddress.toLowerCase();

      const priceUsd =
        tokenPrices.get(
          contractKey
        ) ?? 0;

      token.priceUsd =
        priceUsd;

      token.valueUsd =
        token.balance *
        priceUsd;
    }

    tokens.push(
      ...validTokens
    );
  } catch (error) {
    console.error(
      `${networkName} ERC-20 scan error:`,
      error
    );
  }

  return tokens;
}

/* =========================================================
   SOLANA METADATA
========================================================= */

async function getSolanaAssetMetadata(
  rpcUrl: string,
  mintAddresses: string[]
) {
  const metadata =
    new Map<
      string,
      {
        name: string;
        symbol: string;
        logo:
          | string
          | null;
      }
    >();

  if (
    mintAddresses.length ===
    0
  ) {
    return metadata;
  }

  const chunkSize = 500;

  for (
    let i = 0;
    i < mintAddresses.length;
    i += chunkSize
  ) {
    const chunk =
      mintAddresses.slice(
        i,
        i + chunkSize
      );

    try {
      const response =
        await fetch(
          rpcUrl,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                jsonrpc:
                  "2.0",

                id:
                  1000 + i,

                method:
                  "getAssetBatch_v2",

                params: {
                  ids:
                    chunk,

                  options: {
                    showFungible:
                      true,
                  },
                },
              }),

            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (
        data?.error
      ) {
        console.error(
          "Solana asset metadata error:",
          data.error
        );

        continue;
      }

      const assets =
        Array.isArray(
          data?.result
        )
          ? data.result
          : Array.isArray(
                data?.result
                  ?.items
              )
            ? data.result
                .items
            : [];

      assets.forEach(
        (
          asset: any,
          index: number
        ) => {
          if (!asset) {
            return;
          }

          const mint =
            asset.id ??
            chunk[index];

          if (!mint) {
            return;
          }

          const name =
            asset?.content
              ?.metadata
              ?.name ??
            asset?.metadata
              ?.name ??
            "SPL Token";

          const symbol =
            asset?.content
              ?.metadata
              ?.symbol ??
            asset?.metadata
              ?.symbol ??
            "SPL";

          const logo =
            asset?.content
              ?.links
              ?.image ??
            asset?.content
              ?.files?.[0]
              ?.uri ??
            asset?.content
              ?.files?.[0]
              ?.cdn_uri ??
            null;

          metadata.set(
            mint,
            {
              name,
              symbol,
              logo,
            }
          );
        }
      );
    } catch (error) {
      console.error(
        "Unable to fetch Solana metadata:",
        error
      );
    }
  }

  return metadata;
}

/* =========================================================
   SOLANA WALLET SCANNER
========================================================= */

async function getSolanaTokens(
  apiKey: string,
  address: string
): Promise<WalletToken[]> {
  const rpcUrl =
    `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`;

  const tokens:
    WalletToken[] = [];

  /* =====================================================
     NATIVE SOL
  ===================================================== */

  try {
    const [
      balanceResponse,
      solPrice,
    ] =
      await Promise.all([
        fetch(
          rpcUrl,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                jsonrpc:
                  "2.0",

                id: 1,

                method:
                  "getBalance",

                params: [
                  address,
                  {
                    commitment:
                      "confirmed",
                  },
                ],
              }),

            cache:
              "no-store",
          }
        ),

        getCoinGeckoPrice(
          "solana"
        ),
      ]);

    const balanceData =
      await balanceResponse.json();

    if (
      balanceData?.error
    ) {
      throw new Error(
        balanceData.error
          ?.message ||
          "Unable to retrieve SOL balance"
      );
    }

    const lamports =
      Number(
        balanceData
          ?.result
          ?.value ?? 0
      );

    const solBalance =
      lamports /
      1_000_000_000;

    if (
      solBalance > 0
    ) {
      tokens.push({
        contractAddress:
          null,

        name:
          "Solana",

        symbol:
          "SOL",

        decimals: 9,

        logo: null,

        balance:
          solBalance,

        priceUsd:
          solPrice,

        valueUsd:
          solBalance *
          solPrice,

        network:
          "sol-mainnet",

        networkName:
          "Solana",

        isNative:
          true,
      });
    }
  } catch (error) {
    console.error(
      "Solana native balance error:",
      error
    );

    throw new Error(
      "Unable to retrieve Solana wallet balance"
    );
  }

  /* =====================================================
     SPL + TOKEN-2022
  ===================================================== */

  const tokenAccounts:
    SolanaTokenAccount[] =
    [];

  let pageKey:
    string | null =
    null;

  try {
    for (
      let page = 0;
      page < 10;
      page++
    ) {
      const config:
        Record<
          string,
          unknown
        > = {
        pageLimit:
          1000,
      };

      if (pageKey) {
        config.pageKey =
          pageKey;
      }

      const response =
        await fetch(
          rpcUrl,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                jsonrpc:
                  "2.0",

                id:
                  100 +
                  page,

                method:
                  "getTokenAccountsByOwnerAtSlot",

                params: [
                  address,
                  {},
                  config,
                ],
              }),

            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (
        data?.error
      ) {
        throw new Error(
          data.error
            ?.message ||
          "Unable to retrieve SPL token accounts"
        );
      }

      const pageAccounts:
        SolanaTokenAccount[] =
        data?.result
          ?.value ??
        [];

      tokenAccounts.push(
        ...pageAccounts
      );

      pageKey =
        data?.result
          ?.pageKey ??
        null;

      if (!pageKey) {
        break;
      }
    }
  } catch (error) {
    console.error(
      "Solana token accounts error:",
      error
    );

    return tokens;
  }

  /* =====================================================
     MERGE SPL BALANCES
  ===================================================== */

  const mintBalances =
    new Map<
      string,
      {
        balance:
          number;
        decimals:
          number;
      }
    >();

  for (
    const tokenAccount
    of tokenAccounts
  ) {
    const info =
      tokenAccount
        ?.account
        ?.data
        ?.parsed
        ?.info;

    const mint =
      info?.mint;

    const tokenAmount =
      info?.tokenAmount;

    if (
      !mint ||
      !tokenAmount
    ) {
      continue;
    }

    const decimals =
      typeof tokenAmount.decimals ===
      "number"
        ? tokenAmount.decimals
        : 0;

    let balance = 0;

    if (
      tokenAmount.uiAmountString
    ) {
      balance =
        Number(
          tokenAmount.uiAmountString
        );
    } else if (
      typeof tokenAmount.uiAmount ===
      "number"
    ) {
      balance =
        tokenAmount.uiAmount;
    } else if (
      tokenAmount.amount
    ) {
      balance =
        rawBalanceToNumber(
          tokenAmount.amount,
          decimals
        );
    }

    if (
      !Number.isFinite(
        balance
      ) ||
      balance <= 0
    ) {
      continue;
    }

    const existing =
      mintBalances.get(
        mint
      );

    if (existing) {
      existing.balance +=
        balance;
    } else {
      mintBalances.set(
        mint,
        {
          balance,
          decimals,
        }
      );
    }
  }

  const mintAddresses =
    Array.from(
      mintBalances.keys()
    );

  const metadata =
    await getSolanaAssetMetadata(
      rpcUrl,
      mintAddresses
    );

  const alchemyPrices =
    await getTokenPricesByAddress(
      apiKey,
      "solana-mainnet",
      mintAddresses
    );

  const missingPriceAddresses =
    mintAddresses.filter(
      (mint) =>
        !alchemyPrices.has(
          mint
        )
    );

  const dexScreenerPrices =
    await getDexScreenerSolanaPrices(
      missingPriceAddresses
    );

  for (
    const [
      mint,
      tokenBalance,
    ] of mintBalances.entries()
  ) {
    const tokenMetadata =
      metadata.get(mint);

    const name =
      tokenMetadata?.name ??
      "SPL Token";

    const symbol =
      tokenMetadata?.symbol ??
      "SPL";

    const logo =
      tokenMetadata?.logo ??
      null;

    const priceUsd =
      alchemyPrices.get(
        mint
      ) ??
      dexScreenerPrices.get(
        mint
      ) ??
      0;

    const valueUsd =
      tokenBalance.balance *
      priceUsd;

    tokens.push({
      contractAddress:
        mint,

      name,

      symbol,

      decimals:
        tokenBalance.decimals,

      logo,

      balance:
        tokenBalance.balance,

      priceUsd,

      valueUsd,

      network:
        "sol-mainnet",

      networkName:
        "Solana",

      isNative:
        false,
    });
  }

  return tokens;
}

/* =========================================================
   GROUP TOKENS BY CHAIN
========================================================= */

function groupTokensByChain(
  tokens: WalletToken[]
): ChainGroup[] {
  const grouped =
    tokens.reduce<
      Record<
        string,
        ChainGroup
      >
    >(
      (
        groups,
        token
      ) => {
        if (
          !groups[
            token.network
          ]
        ) {
          groups[
            token.network
          ] = {
            network:
              token.network,

            name:
              token.networkName,

            totalValueUsd:
              0,

            tokenCount:
              0,

            tokens:
              [],
          };
        }

        groups[
          token.network
        ].tokens.push(
          token
        );

        groups[
          token.network
        ].tokenCount +=
          1;

        groups[
          token.network
        ].totalValueUsd +=
          token.valueUsd;

        return groups;
      },
      {}
    );

  const chains =
    Object.values(
      grouped
    );

  chains.forEach(
    (chain) => {
      chain.tokens.sort(
        (a, b) => {
          if (
            b.valueUsd !==
            a.valueUsd
          ) {
            return (
              b.valueUsd -
              a.valueUsd
            );
          }

          return (
            b.balance -
            a.balance
          );
        }
      );
    }
  );

  chains.sort(
    (a, b) =>
      b.totalValueUsd -
      a.totalValueUsd
  );

  return chains;
}

/* =========================================================
   SPLIT NORMAL / SUSPICIOUS TOKENS
========================================================= */

function splitSuspiciousTokens(
  tokens: WalletToken[]
) {
  const classified =
    classifyTokens(
      tokens
    );

  const normalTokens =
    classified.filter(
      (token) =>
        !token.isSuspicious
    );

  const suspiciousTokens =
    classified.filter(
      (token) =>
        token.isSuspicious
    );

  return {
    normalTokens,
    suspiciousTokens,
  };
}

/* =========================================================
   MAIN API ROUTE
========================================================= */

export async function GET(
  request: NextRequest
) {
  const apiKey =
    process.env
      .ALCHEMY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Alchemy API key is missing",
      },
      {
        status: 500,
      }
    );
  }

  const rawAddress =
    request.nextUrl
      .searchParams
      .get("address");

  if (!rawAddress) {
    return NextResponse.json(
      {
        error:
          "Wallet address is required",
      },
      {
        status: 400,
      }
    );
  }

  const address =
    rawAddress.trim();

  const evmWallet =
    isEvmAddress(
      address
    );

  const solanaWallet =
    isSolanaAddress(
      address
    );

  if (
    !evmWallet &&
    !solanaWallet
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid wallet address. Enter a valid EVM or Solana wallet address.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    /* =====================================================
       SOLANA WALLET
    ===================================================== */

    if (
      solanaWallet
    ) {
      const rawTokens =
        await getSolanaTokens(
          apiKey,
          address
        );

      const {
        normalTokens,
        suspiciousTokens,
      } =
        splitSuspiciousTokens(
          rawTokens
        );

      normalTokens.sort(
        (a, b) => {
          if (
            b.valueUsd !==
            a.valueUsd
          ) {
            return (
              b.valueUsd -
              a.valueUsd
            );
          }

          return (
            b.balance -
            a.balance
          );
        }
      );

      const chains =
        groupTokensByChain(
          normalTokens
        );

      const totalPortfolioValueUsd =
        normalTokens.reduce(
          (
            total,
            token
          ) =>
            total +
            token.valueUsd,
          0
        );

      return NextResponse.json(
        {
          success:
            true,

          address,

          addressType:
            "solana",

          totalPortfolioValueUsd,

          chainCount:
            chains.length,

          tokenCount:
            normalTokens.length,

          suspiciousTokenCount:
            suspiciousTokens.length,

          chains,

          tokens:
            normalTokens,

          suspiciousTokens,

          partialErrors:
            [],
        }
      );
    }

    /* =====================================================
       EVM WALLET
    ===================================================== */

    const allTokens:
      WalletToken[] = [];

    const partialErrors:
      unknown[] = [];

    const portfolioNetworks =
      [
        "eth-mainnet",
        "polygon-mainnet",
        "base-mainnet",
        "arb-mainnet",
        "opt-mainnet",
      ];

    const portfolioResult =
      await getPortfolioTokens(
        apiKey,
        address,
        portfolioNetworks
      );

    allTokens.push(
      ...portfolioResult.tokens
    );

    partialErrors.push(
      ...portfolioResult.partialErrors
    );

    /* =====================================================
       NATIVE PRICES
    ===================================================== */

    const [
      ethPriceUsd,
      bnbPriceUsd,
    ] =
      await Promise.all([
        getCoinGeckoPrice(
          "ethereum"
        ),

        getCoinGeckoPrice(
          "binancecoin"
        ),
      ]);

    /* =====================================================
       BNB CHAIN
    ===================================================== */

    const bnbRpcUrl =
      `https://bnb-mainnet.g.alchemy.com/v2/${apiKey}`;

    const bnbTokens =
      await getRpcChainTokens(
        {
          apiKey,

          rpcUrl:
            bnbRpcUrl,

          address,

          network:
            "bnb-mainnet",

          networkName:
            "BNB Chain",

          nativeName:
            "BNB",

          nativeSymbol:
            "BNB",

          nativeDecimals:
            18,

          nativePriceUsd:
            bnbPriceUsd,
        }
      );

    allTokens.push(
      ...bnbTokens
    );

    /* =====================================================
       ROBINHOOD CHAIN
    ===================================================== */

    const robinhoodRpcUrl =
      `https://robinhood-mainnet.g.alchemy.com/v2/${apiKey}`;

    const robinhoodTokens =
      await getRpcChainTokens(
        {
          apiKey,

          rpcUrl:
            robinhoodRpcUrl,

          address,

          network:
            "robinhood-mainnet",

          networkName:
            "Robinhood Chain",

          nativeName:
            "Ethereum",

          nativeSymbol:
            "ETH",

          nativeDecimals:
            18,

          nativePriceUsd:
            ethPriceUsd,
        }
      );

    allTokens.push(
      ...robinhoodTokens
    );

    /* =====================================================
       CLASSIFY SUSPICIOUS TOKENS

       Suspicious assets are separated BEFORE:
       - portfolio totals
       - asset counts
       - chain grouping

       Therefore obvious scam airdrops do not make the
       legitimate portfolio look larger/noisier.
    ===================================================== */

    const {
      normalTokens,
      suspiciousTokens,
    } =
      splitSuspiciousTokens(
        allTokens
      );

    /* =====================================================
       SORT NORMAL TOKENS
    ===================================================== */

    normalTokens.sort(
      (a, b) => {
        if (
          b.valueUsd !==
          a.valueUsd
        ) {
          return (
            b.valueUsd -
            a.valueUsd
          );
        }

        return (
          b.balance -
          a.balance
        );
      }
    );

    /* =====================================================
       GROUP NORMAL TOKENS
    ===================================================== */

    const chains =
      groupTokensByChain(
        normalTokens
      );

    /* =====================================================
       PORTFOLIO VALUE

       Only normal tokens are included.
    ===================================================== */

    const totalPortfolioValueUsd =
      normalTokens.reduce(
        (
          total,
          token
        ) =>
          total +
          token.valueUsd,
        0
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success:
          true,

        address,

        addressType:
          "evm",

        totalPortfolioValueUsd,

        chainCount:
          chains.length,

        tokenCount:
          normalTokens.length,

        suspiciousTokenCount:
          suspiciousTokens.length,

        chains,

        tokens:
          normalTokens,

        /*
          We keep these available instead of throwing
          them away.

          Later the frontend can display:

          "Suspicious Tokens (8)"
             ↓
          [Show tokens]

          rather than mixing them with the portfolio.
        */

        suspiciousTokens,

        partialErrors,
      }
    );
  } catch (error) {
    console.error(
      "Wallet Analyzer error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to analyze wallet";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}