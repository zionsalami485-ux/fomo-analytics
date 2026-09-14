import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Alchemy API key is missing" },
      { status: 500 }
    );
  }

  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Wallet address is required" },
      { status: 400 }
    );
  }

  // Validate Ethereum / EVM wallet address
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(address);

  if (!isValidAddress) {
    return NextResponse.json(
      { error: "Invalid Ethereum wallet address" },
      { status: 400 }
    );
  }

  const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

  try {
    // ------------------------------------------------
    // 1. GET NATIVE ETH BALANCE
    // ------------------------------------------------

    const balanceResponse = await fetch(alchemyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [address, "latest"],
      }),
    });

    const balanceData = await balanceResponse.json();

    if (balanceData.error) {
      return NextResponse.json(
        { error: balanceData.error.message },
        { status: 400 }
      );
    }

    const balanceWei = BigInt(balanceData.result);

    const balanceEth = Number(balanceWei) / 1e18;

    // ------------------------------------------------
    // 2. GET ALL ERC-20 TOKEN BALANCES
    // ------------------------------------------------

    const tokenResponse = await fetch(alchemyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "alchemy_getTokenBalances",
        params: [address, "erc20"],
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.json(
        { error: tokenData.error.message },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // 3. REMOVE TOKENS WITH ZERO BALANCE
    // ------------------------------------------------

    const nonZeroTokens = tokenData.result.tokenBalances.filter(
      (token: {
        contractAddress: string;
        tokenBalance: string | null;
      }) => {
        if (!token.tokenBalance) {
          return false;
        }

        try {
          return BigInt(token.tokenBalance) > BigInt(0);
        } catch {
          return false;
        }
      }
    );

    // ------------------------------------------------
    // 4. GET TOKEN METADATA
    // ------------------------------------------------

    const enrichedTokens = await Promise.all(
      nonZeroTokens.map(
        async (token: {
          contractAddress: string;
          tokenBalance: string;
        }) => {
          try {
            const metadataResponse = await fetch(alchemyUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 3,
                method: "alchemy_getTokenMetadata",
                params: [token.contractAddress],
              }),
            });

            const metadataData = await metadataResponse.json();

            const metadata = metadataData.result;

            const decimals =
              typeof metadata?.decimals === "number"
                ? metadata.decimals
                : 18;

            // Convert raw blockchain balance
            // into a human-readable token amount
            const readableBalance =
              Number(BigInt(token.tokenBalance)) /
              Math.pow(10, decimals);

            return {
              contractAddress: token.contractAddress,

              name: metadata?.name ?? "Unknown Token",

              symbol: metadata?.symbol ?? "UNKNOWN",

              decimals,

              logo: metadata?.logo ?? null,

              balance: readableBalance,

              rawBalance: token.tokenBalance,
            };
          } catch (error) {
            console.error(
              `Unable to get metadata for ${token.contractAddress}:`,
              error
            );

            return {
              contractAddress: token.contractAddress,

              name: "Unknown Token",

              symbol: "UNKNOWN",

              decimals: 18,

              logo: null,

              balance: 0,

              rawBalance: token.tokenBalance,
            };
          }
        }
      )
    );

    // ------------------------------------------------
    // 5. SEND RESULT TO TRACKR AI
    // ------------------------------------------------

    return NextResponse.json({
      success: true,

      address,

      network: "Ethereum Mainnet",

      balance: balanceEth,

      symbol: "ETH",

      tokenCount: enrichedTokens.length,

      tokens: enrichedTokens,
    });
  } catch (error) {
    console.error("Wallet analysis error:", error);

    return NextResponse.json(
      { error: "Unable to analyze wallet" },
      { status: 500 }
    );
  }
}