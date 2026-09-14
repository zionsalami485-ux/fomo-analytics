import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

/* =========================================================
   CONFIG
========================================================= */

const CACHE_TTL_SECONDS = 15 * 60;

const BLOCKSCOUT_BASE_URL =
  "https://robinhoodchain.blockscout.com/api/v2";

const ROBINHOOD_CHAIN_ID = 4663;
const ROBINHOOD_CHAIN_NAME = "Robinhood Chain";

/* =========================================================
   TYPES
========================================================= */

type HolderType = "wallet" | "contract";

type Holder = {
  rank: number;
  address: string;
  balance: string;
  balanceRaw: string;
  supplyPercentage: number;
  addressType: HolderType;
  isContract: boolean;
  isWhale: boolean;
};

type BlockscoutAddress = {
  hash?: string;
  is_contract?: boolean;
  name?: string | null;
};

type BlockscoutHolderItem = {
  value?: string;

  address?: BlockscoutAddress;

  address_hash?: BlockscoutAddress | string;
};

type BlockscoutHoldersResponse = {
  items?: BlockscoutHolderItem[];

  next_page_params?: Record<
    string,
    string | number | boolean | null
  > | null;
};

type BlockscoutTokenResponse = {
  address?: string;
  address_hash?: string;

  name?: string | null;
  symbol?: string | null;

  decimals?: string | number | null;

  total_supply?: string | null;

  holders?: string | number | null;
  holders_count?: string | number | null;

  type?: string | null;
};

type BlockscoutCountersResponse = {
  token_holders_count?: string | number;
  transfers_count?: string | number;
};

type HolderAnalysis = {
  success: true;

  network: {
    name: string;
    chainId: number;
  };

  token: {
    contractAddress: string;
    name: string | null;
    symbol: string | null;
    decimals: number;
    totalSupply: string;
    totalSupplyRaw: string;
  };

  contract: {
    deploymentBlock: number;
    latestBlock: number;
    contractAgeBlocks: number;
    deploymentSearchChecks: number;
  };

  scan: {
    chunkSize: number;
    chunksScanned: number;
    blocksScanned: number;
    transferEventsFound: number;
    firstTransferBlock: number | null;
    lastTransferBlock: number | null;
  };

  intelligence: {
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

  topHolders: Holder[];

  source: {
    provider: string;
    method: string;
    indexed: boolean;
    fallbackUsed: boolean;
  };

  cache: {
    generatedAt: string;
    ttlSeconds: number;
  };
};

/* =========================================================
   VALIDATION
========================================================= */

function isEvmAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/* =========================================================
   HELPERS
========================================================= */

function safeBigInt(
  value: string | number | null | undefined
): bigint {
  try {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return BigInt(0);
    }

    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function safeNumber(
  value: string | number | null | undefined,
  fallback = 0
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

/* =========================================================
   TOKEN AMOUNT FORMATTER
========================================================= */

function formatTokenAmount(
  rawAmount: bigint,
  decimals: number
) {
  if (decimals <= 0) {
    return rawAmount.toString();
  }

  const divisor =
    BigInt(10) ** BigInt(decimals);

  const whole =
    rawAmount / divisor;

  const fraction =
    rawAmount % divisor;

  if (fraction === BigInt(0)) {
    return whole.toString();
  }

  const fractionString =
    fraction
      .toString()
      .padStart(decimals, "0")
      .replace(/0+$/, "");

  return `${whole.toString()}.${fractionString}`;
}

/* =========================================================
   PERCENTAGE
========================================================= */

function calculatePercentage(
  balance: bigint,
  supply: bigint
) {
  if (supply <= BigInt(0)) {
    return 0;
  }

  const scaled =
    (balance * BigInt(100000000)) /
    supply;

  return Number(scaled) / 1000000;
}

/* =========================================================
   BLOCKSCOUT FETCH
========================================================= */

async function blockscoutFetch<T>(
  path: string
): Promise<T> {
  const url =
    `${BLOCKSCOUT_BASE_URL}${path}`;

  const response = await fetch(url, {
    method: "GET",

    headers: {
      Accept:
        "application/json, text/plain, */*",

      "Accept-Language":
        "en-US,en;q=0.9",

      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",

      Referer:
        "https://robinhoodchain.blockscout.com/",

      "Cache-Control":
        "no-cache",

      Pragma:
        "no-cache",
    },

    cache: "no-store",
  });

  if (!response.ok) {
    const responseText =
      await response.text();

    console.error(
      "Blockscout request failed:",
      response.status,
      url,
      responseText.slice(0, 500)
    );

    if (response.status === 404) {
      throw new Error(
        "Token was not found on Robinhood Chain."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "Blockscout temporarily rejected the Holder Intelligence request."
      );
    }

    throw new Error(
      `Blockscout request failed: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

/* =========================================================
   TOKEN INFO
========================================================= */

async function getBlockscoutToken(
  tokenAddress: string
) {
  return blockscoutFetch<BlockscoutTokenResponse>(
    `/tokens/${tokenAddress}`
  );
}

/* =========================================================
   TOKEN COUNTERS
========================================================= */

async function getBlockscoutCounters(
  tokenAddress: string
) {
  try {
    return await blockscoutFetch<BlockscoutCountersResponse>(
      `/tokens/${tokenAddress}/counters`
    );
  } catch {
    return null;
  }
}

/* =========================================================
   HOLDERS
========================================================= */

async function getBlockscoutTopHolders(
  tokenAddress: string
) {
  const data =
    await blockscoutFetch<BlockscoutHoldersResponse>(
      `/tokens/${tokenAddress}/holders`
    );

  if (!Array.isArray(data.items)) {
    return [];
  }

  return data.items.slice(0, 20);
}

/* =========================================================
   EXTRACT HOLDER ADDRESS
========================================================= */

function getHolderAddress(
  holder: BlockscoutHolderItem
) {
  if (
    holder.address &&
    typeof holder.address.hash === "string"
  ) {
    return holder.address.hash.toLowerCase();
  }

  if (
    typeof holder.address_hash === "string"
  ) {
    return holder.address_hash.toLowerCase();
  }

  if (
    holder.address_hash &&
    typeof holder.address_hash === "object" &&
    typeof holder.address_hash.hash === "string"
  ) {
    return holder.address_hash.hash.toLowerCase();
  }

  return null;
}

/* =========================================================
   EXTRACT CONTRACT STATUS
========================================================= */

function getHolderIsContract(
  holder: BlockscoutHolderItem
) {
  if (
    holder.address &&
    typeof holder.address.is_contract === "boolean"
  ) {
    return holder.address.is_contract;
  }

  if (
    holder.address_hash &&
    typeof holder.address_hash === "object" &&
    typeof holder.address_hash.is_contract === "boolean"
  ) {
    return holder.address_hash.is_contract;
  }

  return false;
}

/* =========================================================
   RPC
========================================================= */

async function rpcCall(
  rpcUrl: string,
  method: string,
  params: unknown[]
) {
  const response = await fetch(
    rpcUrl,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),

      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Robinhood RPC request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  if (data.error) {
    throw new Error(
      data.error.message ||
        "Robinhood RPC returned an error."
    );
  }

  return data.result;
}

/* =========================================================
   ALCHEMY FALLBACK CLASSIFICATION
========================================================= */

async function getAddressTypeFromAlchemy(
  rpcUrl: string,
  address: string
): Promise<HolderType> {
  try {
    const code =
      await rpcCall(
        rpcUrl,
        "eth_getCode",
        [
          address,
          "latest",
        ]
      );

    const hasCode =
      typeof code === "string" &&
      code !== "0x" &&
      code !== "0x0";

    return hasCode
      ? "contract"
      : "wallet";
  } catch {
    return "wallet";
  }
}

/* =========================================================
   DETERMINE HOLDER TYPE
========================================================= */

async function determineHolderType(
  holder: BlockscoutHolderItem,
  rpcUrl: string | null
): Promise<HolderType> {
  if (getHolderIsContract(holder)) {
    return "contract";
  }

  if (
    holder.address &&
    holder.address.is_contract === false
  ) {
    return "wallet";
  }

  if (
    holder.address_hash &&
    typeof holder.address_hash === "object" &&
    holder.address_hash.is_contract === false
  ) {
    return "wallet";
  }

  const address =
    getHolderAddress(holder);

  if (!address || !rpcUrl) {
    return "wallet";
  }

  return getAddressTypeFromAlchemy(
    rpcUrl,
    address
  );
}

/* =========================================================
   BUILD HOLDER ANALYSIS
========================================================= */

async function buildHolderAnalysis(
  tokenAddress: string
): Promise<HolderAnalysis> {
  const apiKey =
    process.env.ALCHEMY_API_KEY;

  const rpcUrl =
    apiKey
      ? `https://robinhood-mainnet.g.alchemy.com/v2/${apiKey}`
      : null;

  /* =====================================================
     FETCH DATA
  ===================================================== */

  const [
    tokenInfo,
    counters,
    holderItems,
  ] =
    await Promise.all([
      getBlockscoutToken(
        tokenAddress
      ),

      getBlockscoutCounters(
        tokenAddress
      ),

      getBlockscoutTopHolders(
        tokenAddress
      ),
    ]);

  /* =====================================================
     TOKEN METADATA
  ===================================================== */

  const decimals =
    Math.max(
      0,
      safeNumber(
        tokenInfo.decimals,
        18
      )
    );

  const totalSupply =
    safeBigInt(
      tokenInfo.total_supply
    );

  if (totalSupply <= BigInt(0)) {
    throw new Error(
      "Unable to read a valid token total supply."
    );
  }

  /* =====================================================
     BUILD TOP 20
  ===================================================== */

  const validHolders =
    holderItems
      .map((holder) => {
        const address =
          getHolderAddress(holder);

        const balance =
          safeBigInt(
            holder.value
          );

        if (
          !address ||
          !isEvmAddress(address) ||
          balance <= BigInt(0)
        ) {
          return null;
        }

        return {
          holder,
          address,
          balance,
        };
      })
      .filter(
        (
          item
        ): item is {
          holder: BlockscoutHolderItem;
          address: string;
          balance: bigint;
        } => item !== null
      )
      .sort(
        (a, b) => {
          if (a.balance > b.balance) {
            return -1;
          }

          if (a.balance < b.balance) {
            return 1;
          }

          return 0;
        }
      )
      .slice(0, 20);

  const classified =
    await Promise.all(
      validHolders.map(
        async (item) => {
          const addressType =
            await determineHolderType(
              item.holder,
              rpcUrl
            );

          return {
            ...item,
            addressType,
          };
        }
      )
    );

  const topHolders: Holder[] =
    classified.map(
      (item, index) => {
        const supplyPercentage =
          calculatePercentage(
            item.balance,
            totalSupply
          );

        const isWhale =
          item.addressType ===
            "wallet" &&
          supplyPercentage >= 1;

        return {
          rank:
            index + 1,

          address:
            item.address,

          balance:
            formatTokenAmount(
              item.balance,
              decimals
            ),

          balanceRaw:
            item.balance.toString(),

          supplyPercentage,

          addressType:
            item.addressType,

          isContract:
            item.addressType ===
            "contract",

          isWhale,
        };
      }
    );

  /* =====================================================
     TOP 10 CONCENTRATION
  ===================================================== */

  const top10Balance =
    validHolders
      .slice(0, 10)
      .reduce(
        (
          total,
          holder
        ) =>
          total +
          holder.balance,
        BigInt(0)
      );

  const top10Concentration =
    calculatePercentage(
      top10Balance,
      totalSupply
    );

  /* =====================================================
     TOP HOLDER
  ===================================================== */

  const topHolderPercentage =
    validHolders.length > 0
      ? calculatePercentage(
          validHolders[0].balance,
          totalSupply
        )
      : 0;

  /* =====================================================
     HOLDER COUNTS
  ===================================================== */

  const counterHolderCount =
    safeNumber(
      counters?.token_holders_count,
      0
    );

  const tokenHolderCount =
    safeNumber(
      tokenInfo.holders_count ??
        tokenInfo.holders,
      0
    );

  const totalHolders =
    counterHolderCount > 0
      ? counterHolderCount
      : tokenHolderCount > 0
        ? tokenHolderCount
        : validHolders.length;

  /* =====================================================
     TRANSFER COUNT
  ===================================================== */

  const transferCount =
    safeNumber(
      counters?.transfers_count,
      0
    );

  /* =====================================================
     COUNTS
  ===================================================== */

  const top20ContractCount =
    topHolders.filter(
      (holder) =>
        holder.addressType ===
        "contract"
    ).length;

  const top20WalletCount =
    topHolders.filter(
      (holder) =>
        holder.addressType ===
        "wallet"
    ).length;

  const whaleCount =
    topHolders.filter(
      (holder) =>
        holder.isWhale
    ).length;

  /* =====================================================
     INDEXED TOP 20 SUPPLY SHARE
  ===================================================== */

  const indexedTop20Balance =
    validHolders.reduce(
      (
        total,
        holder
      ) =>
        total +
        holder.balance,
      BigInt(0)
    );

  const indexedTop20Percentage =
    calculatePercentage(
      indexedTop20Balance,
      totalSupply
    );

  /* =====================================================
     OPTIONAL LATEST BLOCK
  ===================================================== */

  let latestBlock = 0;

  if (rpcUrl) {
    try {
      const latestBlockHex =
        await rpcCall(
          rpcUrl,
          "eth_blockNumber",
          []
        );

      latestBlock =
        parseInt(
          latestBlockHex,
          16
        );

      if (
        !Number.isFinite(
          latestBlock
        )
      ) {
        latestBlock = 0;
      }
    } catch {
      latestBlock = 0;
    }
  }

  /* =====================================================
     RETURN
  ===================================================== */

  return {
    success: true,

    network: {
      name:
        ROBINHOOD_CHAIN_NAME,

      chainId:
        ROBINHOOD_CHAIN_ID,
    },

    token: {
      contractAddress:
        tokenAddress,

      name:
        tokenInfo.name ??
        null,

      symbol:
        tokenInfo.symbol ??
        null,

      decimals,

      totalSupply:
        formatTokenAmount(
          totalSupply,
          decimals
        ),

      totalSupplyRaw:
        totalSupply.toString(),
    },

    contract: {
      deploymentBlock: 0,

      latestBlock,

      contractAgeBlocks: 0,

      deploymentSearchChecks: 0,
    },

    scan: {
      chunkSize: 0,

      chunksScanned: 0,

      blocksScanned: 0,

      transferEventsFound:
        transferCount,

      firstTransferBlock: null,

      lastTransferBlock: null,
    },

    intelligence: {
      totalHolders,

      top10Concentration,

      topHolderPercentage,

      whaleCount,

      whaleThresholdPercentage:
        1,

      whaleDefinition:
        "Non-contract holder with at least 1% of total supply",

      top20WalletCount,

      top20ContractCount,

      reconstructedSupply:
        formatTokenAmount(
          indexedTop20Balance,
          decimals
        ),

      reconstructedSupplyPercentage:
        indexedTop20Percentage,
    },

    topHolders,

    source: {
      provider:
        "Blockscout",

      method:
        "Indexed token holder data",

      indexed:
        true,

      fallbackUsed:
        false,
    },

    cache: {
      generatedAt:
        new Date().toISOString(),

      ttlSeconds:
        CACHE_TTL_SECONDS,
    },
  };
}

/* =========================================================
   CACHE
========================================================= */

const getCachedHolderAnalysis =
  unstable_cache(
    async (
      tokenAddress: string
    ) =>
      buildHolderAnalysis(
        tokenAddress
      ),

    [
      "trackr-holder-intelligence-v3",
    ],

    {
      revalidate:
        CACHE_TTL_SECONDS,
    }
  );

/* =========================================================
   ROUTE
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const tokenAddress =
      request.nextUrl.searchParams
        .get("token")
        ?.trim()
        .toLowerCase() || "";

    if (!tokenAddress) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Token contract address is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isEvmAddress(
        tokenAddress
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Invalid token contract address.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await getCachedHolderAnalysis(
        tokenAddress
      );

    return NextResponse.json(
      result,
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=900, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error(
      "Holder Intelligence error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve holder data.",
      },
      {
        status: 500,
      }
    );
  }
}