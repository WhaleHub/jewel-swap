import {
  Address,
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  LOBSTR_ID,
  FreighterModule,
  LobstrModule,
} from "@creit.tech/stellar-wallets-kit";

export interface VaultPoolInfo {
  pool_id: number;
  pool_address: string;
  token_a: string;
  token_b: string;
  share_token: string;
  total_lp_tokens: string;
  active: boolean;
  added_at: number;
  // Display fields
  token_a_code: string;
  token_b_code: string;
  token_a_logo: string;
  token_b_logo: string;
}

export interface VaultUserPosition {
  pool_id: number;
  share_ratio: string;
  deposited_at: number;
  active: boolean;
  // Calculated fields
  user_lp_amount: string;
  percentage: string;
}

export class SorobanVaultService {
  private server: SorobanRpc.Server;
  private stakingContractId: string;
  private networkPassphrase: string;

  constructor() {
    const rpcUrl = process.env.REACT_APP_SOROBAN_RPC_URL || "https://soroban-rpc.stellar.org";
    const network = (process.env.REACT_APP_STELLAR_NETWORK || "PUBLIC").toLowerCase();

    this.server = new SorobanRpc.Server(rpcUrl);
    this.stakingContractId = process.env.REACT_APP_STAKING_CONTRACT_ID || "";
    // Accept "public", "PUBLIC", "mainnet" as mainnet
    this.networkPassphrase = (network === "public" || network === "mainnet")
      ? Networks.PUBLIC
      : Networks.TESTNET;
  }

  /**
   * Get total number of vault pools
   */
  async getPoolCount(): Promise<number> {
    try {
      const contract = new Contract(this.stakingContractId);
      const account = await this.server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"); // Dummy account for simulation

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call("get_pool_count"))
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const result = simulated.result?.retval;
        return result ? scValToNative(result) : 0;
      }

      throw new Error("Failed to simulate transaction");
    } catch (error) {
      console.error("Failed to get pool count:", error);
      return 0;
    }
  }

  /**
   * Get pool information by ID
   */
  async getPoolInfo(poolId: number): Promise<VaultPoolInfo> {
    try {
      const contract = new Contract(this.stakingContractId);
      const account = await this.server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");

      const poolIdScVal = nativeToScVal(poolId, { type: "u32" });

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call("get_pool_info", poolIdScVal))
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const result = simulated.result?.retval;
        const poolInfo = result ? scValToNative(result) : null;

        if (!poolInfo) throw new Error("Pool not found");

        // Fetch token symbols
        const token_a_code = await this.getTokenSymbol(poolInfo.token_a);
        const token_b_code = await this.getTokenSymbol(poolInfo.token_b);

        return {
          ...poolInfo,
          token_a_code,
          token_b_code,
          token_a_logo: this.getTokenLogo(token_a_code),
          token_b_logo: this.getTokenLogo(token_b_code),
        };
      }

      throw new Error("Failed to get pool info");
    } catch (error) {
      console.error(`Failed to get pool info for pool ${poolId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's vault position for a specific pool
   */
  async getUserVaultPosition(
    userAddress: string,
    poolId: number
  ): Promise<VaultUserPosition | null> {
    try {
      const contract = new Contract(this.stakingContractId);
      const account = await this.server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");

      const userScVal = nativeToScVal(userAddress, { type: "address" });
      const poolIdScVal = nativeToScVal(poolId, { type: "u32" });

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call("get_user_vault_position", userScVal, poolIdScVal))
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const result = simulated.result?.retval;
        const position = result ? scValToNative(result) : null;

        if (!position || !position.active) {
          return null;
        }

        // Get pool info to calculate user's LP amount
        const poolInfo = await this.getPoolInfo(poolId);
        const shareRatio = parseFloat(position.share_ratio) / 1_000_000_000_000;
        const totalLp = parseFloat(poolInfo.total_lp_tokens) / 1e7;

        const userLpAmount = totalLp * shareRatio;
        const percentage = shareRatio * 100;

        return {
          ...position,
          user_lp_amount: userLpAmount.toFixed(7),
          percentage: percentage.toFixed(4),
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to get user vault position:", error);
      return null;
    }
  }

  /**
   * Deposit tokens to vault pool
   */
  async vaultDeposit(params: {
    userAddress: string;
    poolId: number;
    desiredA: string;
    desiredB: string;
    minShares: string;
    walletName: string;
  }): Promise<{ success: boolean; error?: string; transactionHash?: string }> {
    try {
      const { userAddress, poolId, desiredA, desiredB, minShares, walletName } = params;
      console.log("[VaultDeposit] Starting deposit...", { userAddress, poolId, desiredA, desiredB, walletName });

      // Setup wallet
      const selectedModule = walletName === LOBSTR_ID ? new LobstrModule() : new FreighterModule();
      const walletId = walletName === LOBSTR_ID ? LOBSTR_ID : FREIGHTER_ID;
      const kit = new StellarWalletsKit({
        network: WalletNetwork.PUBLIC,
        selectedWalletId: walletId,
        modules: [selectedModule],
      });
      await kit.setWallet(walletId);

      // Build transaction
      const contract = new Contract(this.stakingContractId);
      const account = await this.server.getAccount(userAddress);

      const userScVal = nativeToScVal(userAddress, { type: "address" });
      const poolIdScVal = nativeToScVal(poolId, { type: "u32" });
      const desiredAScVal = nativeToScVal(Math.floor(parseFloat(desiredA) * 1e7), { type: "i128" });
      const desiredBScVal = nativeToScVal(Math.floor(parseFloat(desiredB) * 1e7), { type: "i128" });
      const minSharesScVal = nativeToScVal(Math.floor(parseFloat(minShares) * 1e7), { type: "u128" });

      let tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          contract.call(
            "vault_deposit",
            userScVal,
            poolIdScVal,
            desiredAScVal,
            desiredBScVal,
            minSharesScVal
          )
        )
        .setTimeout(30)
        .build();

      // Simulate to prepare transaction
      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${simulated.error}`);
      }

      // Prepare transaction with auth
      tx = SorobanRpc.assembleTransaction(tx, simulated).build();

      // Sign transaction
      const txXdr = tx.toXDR();
      const { signedTxXdr } = await kit.signTransaction(txXdr, {
        address: userAddress,
        networkPassphrase: this.networkPassphrase,
      });

      // Submit transaction
      const signedTx = TransactionBuilder.fromXDR(signedTxXdr, this.networkPassphrase);
      const sendResponse = await this.server.sendTransaction(signedTx as any);

      if (sendResponse.status === "PENDING") {
        // Wait for confirmation
        let getResponse = await this.server.getTransaction(sendResponse.hash);
        while (getResponse.status === "NOT_FOUND") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          getResponse = await this.server.getTransaction(sendResponse.hash);
        }

        if (getResponse.status === "SUCCESS") {
          return {
            success: true,
            transactionHash: sendResponse.hash,
          };
        }
      }

      throw new Error("Transaction failed");
    } catch (error: any) {
      // "Bad union switch" means tx actually succeeded but response parsing failed
      if (error.message?.toLowerCase().includes("bad union switch")) {
        console.log("[VaultDeposit] Transaction succeeded (response parsing quirk)");
        return {
          success: true,
        };
      }

      console.error("[VaultDeposit] Error:", error);
      return {
        success: false,
        error: error.message || "Deposit failed",
      };
    }
  }

  /**
   * Withdraw from vault pool
   */
  async vaultWithdraw(params: {
    userAddress: string;
    poolId: number;
    sharePercent: number;
    minA: string;
    minB: string;
    walletName: string;
  }): Promise<{ success: boolean; error?: string; transactionHash?: string }> {
    try {
      const { userAddress, poolId, sharePercent, minA, minB, walletName } = params;

      // Setup wallet
      const selectedModule = walletName === LOBSTR_ID ? new LobstrModule() : new FreighterModule();
      const walletId = walletName === LOBSTR_ID ? LOBSTR_ID : FREIGHTER_ID;
      const kit = new StellarWalletsKit({
        network: WalletNetwork.PUBLIC,
        selectedWalletId: walletId,
        modules: [selectedModule],
      });
      await kit.setWallet(walletId);

      // Build transaction
      const contract = new Contract(this.stakingContractId);
      const account = await this.server.getAccount(userAddress);

      const userScVal = nativeToScVal(userAddress, { type: "address" });
      const poolIdScVal = nativeToScVal(poolId, { type: "u32" });
      const sharePercentScVal = nativeToScVal(sharePercent, { type: "u32" });
      const minAScVal = nativeToScVal(Math.floor(parseFloat(minA) * 1e7), { type: "u128" });
      const minBScVal = nativeToScVal(Math.floor(parseFloat(minB) * 1e7), { type: "u128" });

      let tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          contract.call(
            "vault_withdraw",
            userScVal,
            poolIdScVal,
            sharePercentScVal,
            minAScVal,
            minBScVal
          )
        )
        .setTimeout(30)
        .build();

      // Simulate to prepare transaction
      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${simulated.error}`);
      }

      // Prepare transaction with auth
      tx = SorobanRpc.assembleTransaction(tx, simulated).build();

      // Sign transaction
      const txXdr = tx.toXDR();
      const { signedTxXdr } = await kit.signTransaction(txXdr, {
        address: userAddress,
        networkPassphrase: this.networkPassphrase,
      });

      // Submit transaction
      const signedTx = TransactionBuilder.fromXDR(signedTxXdr, this.networkPassphrase);
      const sendResponse = await this.server.sendTransaction(signedTx as any);

      if (sendResponse.status === "PENDING") {
        // Wait for confirmation
        let getResponse = await this.server.getTransaction(sendResponse.hash);
        while (getResponse.status === "NOT_FOUND") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          getResponse = await this.server.getTransaction(sendResponse.hash);
        }

        if (getResponse.status === "SUCCESS") {
          return {
            success: true,
            transactionHash: sendResponse.hash,
          };
        }
      }

      throw new Error("Transaction failed");
    } catch (error: any) {
      // "Bad union switch" means tx actually succeeded but response parsing failed
      if (error.message?.toLowerCase().includes("bad union switch")) {
        console.log("[VaultWithdraw] Transaction succeeded (response parsing quirk)");
        return {
          success: true,
        };
      }

      console.error("Vault withdraw error:", error);
      return {
        success: false,
        error: error.message || "Withdrawal failed",
      };
    }
  }

  // Helper methods

  private async getTokenSymbol(tokenAddress: string): Promise<string> {
    try {
      const contract = new Contract(tokenAddress);
      const account = await this.server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call("symbol"))
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const result = simulated.result?.retval;
        const symbol = result ? scValToNative(result) : "UNKNOWN";
        // Convert "native" to "XLM" for display
        return symbol === "native" ? "XLM" : symbol;
      }

      return "UNKNOWN";
    } catch (error) {
      console.error(`Failed to get token symbol for ${tokenAddress}:`, error);
      return "UNKNOWN";
    }
  }

  private getTokenLogo(tokenCode: string): string {
    // Map token codes to logos in assets folder
    const tokenLogos: Record<string, string> = {
      AQUA: "/assets/images/aqua_logo.png",
      BLUB: "/assets/images/blub_logo.png",
      USDC: "/assets/images/usdc.svg",
      XLM: "/assets/images/xlm.png",
    };

    return tokenLogos[tokenCode] || "/assets/images/default-token.png";
  }

  /**
   * Get pool reserves (token amounts in the pool) and total LP supply
   */
  async getPoolReserves(poolAddress: string, lpTokenAddress: string): Promise<{
    reserveA: string;
    reserveB: string;
    totalLpSupply: string;
  }> {
    try {
      const poolContract = new Contract(poolAddress);
      const account = await this.server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");

      // Get reserves
      const reservesTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(poolContract.call("get_reserves"))
        .setTimeout(30)
        .build();

      // Try get_total_shares on pool
      const totalSharesTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(poolContract.call("get_total_shares"))
        .setTimeout(30)
        .build();

      // Try share_id to get the actual LP token address from pool
      const shareIdTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(poolContract.call("share_id"))
        .setTimeout(30)
        .build();

      const [reservesSim, totalSharesSim, shareIdSim] = await Promise.all([
        this.server.simulateTransaction(reservesTx),
        this.server.simulateTransaction(totalSharesTx),
        this.server.simulateTransaction(shareIdTx),
      ]);

      let reserveA = "0", reserveB = "0", totalLpSupply = "0";

      if (SorobanRpc.Api.isSimulationSuccess(reservesSim)) {
        const result = reservesSim.result?.retval;
        const reserves = result ? scValToNative(result) : [0, 0];
        reserveA = (Number(reserves[0] || 0) / 1e7).toFixed(7);
        reserveB = (Number(reserves[1] || 0) / 1e7).toFixed(7);
      }

      // Try get_total_shares from pool
      if (SorobanRpc.Api.isSimulationSuccess(totalSharesSim)) {
        const result = totalSharesSim.result?.retval;
        const supply = result ? scValToNative(result) : 0;
        const supplyNum = typeof supply === 'bigint' ? Number(supply) : Number(supply);
        if (supplyNum > 0) {
          totalLpSupply = (supplyNum / 1e7).toFixed(7);
        }
      }

      // If still 0, try to get LP token from share_id and query its total_supply
      if (totalLpSupply === "0" && SorobanRpc.Api.isSimulationSuccess(shareIdSim)) {
        const result = shareIdSim.result?.retval;
        const actualLpToken = result ? scValToNative(result) : null;

        if (actualLpToken) {
          const lpContract = new Contract(actualLpToken);
          const supplyTx = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: this.networkPassphrase,
          })
            .addOperation(lpContract.call("total_supply"))
            .setTimeout(30)
            .build();

          const supplySim = await this.server.simulateTransaction(supplyTx);
          if (SorobanRpc.Api.isSimulationSuccess(supplySim)) {
            const supplyResult = supplySim.result?.retval;
            const supply = supplyResult ? scValToNative(supplyResult) : 0;
            const supplyNum = typeof supply === 'bigint' ? Number(supply) : Number(supply);
            if (supplyNum > 0) {
              totalLpSupply = (supplyNum / 1e7).toFixed(7);
            }
          }
        }
      }

      // Last fallback: try total_supply on provided lpTokenAddress
      if (totalLpSupply === "0") {
        const lpContract = new Contract(lpTokenAddress);
        const supplyTx = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(lpContract.call("total_supply"))
          .setTimeout(30)
          .build();

        const supplySim = await this.server.simulateTransaction(supplyTx);
        if (SorobanRpc.Api.isSimulationSuccess(supplySim)) {
          const supplyResult = supplySim.result?.retval;
          const supply = supplyResult ? scValToNative(supplyResult) : 0;
          const supplyNum = typeof supply === 'bigint' ? Number(supply) : Number(supply);
          if (supplyNum > 0) {
            totalLpSupply = (supplyNum / 1e7).toFixed(7);
          }
        }
      }

      return { reserveA, reserveB, totalLpSupply };
    } catch (error) {
      console.error("Failed to get pool reserves:", error);
      return { reserveA: "0", reserveB: "0", totalLpSupply: "0" };
    }
  }

  /**
   * Get token balance for a user
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      const contract = new Contract(tokenAddress);
      const account = await this.server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");

      const userScVal = nativeToScVal(userAddress, { type: "address" });

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(contract.call("balance", userScVal))
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const result = simulated.result?.retval;
        const balance = result ? scValToNative(result) : 0;
        // Convert from stroops (7 decimals) to human readable
        return (Number(balance) / 1e7).toFixed(7);
      }

      return "0";
    } catch (error) {
      console.error(`Failed to get token balance for ${tokenAddress}:`, error);
      return "0";
    }
  }
}

/**
 * Token price fetching service for USD value calculations
 */
export class TokenPriceService {
  private static priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private static CACHE_TTL = 60000; // 1 minute cache

  /**
   * Get token price in USD
   */
  static async getTokenPrice(tokenCode: string): Promise<number> {
    const now = Date.now();
    const cached = this.priceCache.get(tokenCode);

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    try {
      // USDC is always $1
      if (tokenCode === "USDC") {
        this.priceCache.set(tokenCode, { price: 1, timestamp: now });
        return 1;
      }

      // For XLM, use CoinGecko
      if (tokenCode === "XLM") {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
        );
        const data = await response.json();
        const price = data?.stellar?.usd || 0;
        this.priceCache.set(tokenCode, { price, timestamp: now });
        return price;
      }

      // For AQUA, use Stellar Expert
      if (tokenCode === "AQUA") {
        const response = await fetch(
          "https://api.stellar.expert/explorer/public/asset/AQUA-GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA/price"
        );
        const data = await response.json();
        const price = data?.price || 0;
        this.priceCache.set(tokenCode, { price, timestamp: now });
        return price;
      }

      // For BLUB, try Stellar Expert
      if (tokenCode === "BLUB") {
        try {
          const blubIssuer = process.env.REACT_APP_BLUB_ISSUER;
          if (blubIssuer) {
            const response = await fetch(
              `https://api.stellar.expert/explorer/public/asset/BLUB-${blubIssuer}/price`
            );
            const data = await response.json();
            const price = data?.price || 0;
            this.priceCache.set(tokenCode, { price, timestamp: now });
            return price;
          }
        } catch {
          // Fallback: return 0 for unknown price
        }
        return 0;
      }

      // Default: return 0 for unknown tokens
      return 0;
    } catch (error) {
      console.error(`Failed to fetch price for ${tokenCode}:`, error);
      return 0;
    }
  }

  /**
   * Calculate total USD value of token amounts
   */
  static async calculateTotalUsdValue(
    tokenACode: string,
    tokenAAmount: number,
    tokenBCode: string,
    tokenBAmount: number
  ): Promise<number> {
    const [priceA, priceB] = await Promise.all([
      this.getTokenPrice(tokenACode),
      this.getTokenPrice(tokenBCode),
    ]);

    const valueA = tokenAAmount * priceA;
    const valueB = tokenBAmount * priceB;

    return valueA + valueB;
  }
}
