import {
  SorobanRpc,
  Address,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  xdr,
  scValToNative,
  nativeToScVal,
  Account,
} from "@stellar/stellar-sdk";

// Contract configuration
interface ContractConfig {
  stakingContract: string;
  rewardsContract: string;
  liquidityContract: string;
  network: string;
  rpcUrl: string;
}

// Contract call result interface
export interface ContractCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionHash?: string;
  ledger?: number;
}

// Transaction options
interface TransactionOptions {
  fee?: string;
  timeout?: number;
  simulate?: boolean;
}

export class SorobanService {
  private server: SorobanRpc.Server;
  private contractConfig: ContractConfig;

  constructor() {
    // Helper to get required env variable
    const getRequiredEnv = (key: string): string => {
      const value = process.env[key];
      if (!value) {
        throw new Error(
          `❌ [SorobanService] Missing required environment variable: ${key}. Please set it in your .env file.`
        );
      }
      return value;
    };

    this.contractConfig = {
      stakingContract: getRequiredEnv("REACT_APP_STAKING_CONTRACT_ID"),
      rewardsContract: getRequiredEnv("REACT_APP_REWARDS_CONTRACT_ID"),
      liquidityContract: getRequiredEnv("REACT_APP_LIQUIDITY_CONTRACT_ID"),
      network: getRequiredEnv("REACT_APP_STELLAR_NETWORK"),
      rpcUrl: getRequiredEnv("REACT_APP_SOROBAN_RPC_URL"),
    };

    this.server = new SorobanRpc.Server(this.contractConfig.rpcUrl);
    console.log(
      "🔗 [SorobanService] Initialized with config:",
      this.contractConfig
    );
  }

  /**
   * Get contract instance for a specific contract type
   */
  getContract(
    contractType: "staking" | "rewards" | "liquidity"
  ): Contract {
    const contractId = this.getContractId(contractType);
    return new Contract(contractId);
  }

  /**
   * Get contract ID for a specific contract type
   */
  getContractId(
    contractType: "staking" | "rewards" | "liquidity"
  ): string {
    switch (contractType) {
      case "staking":
        return this.contractConfig.stakingContract;
      case "rewards":
        return this.contractConfig.rewardsContract;
      case "liquidity":
        return this.contractConfig.liquidityContract;
      default:
        throw new Error(`Unknown contract type: ${contractType}`);
    }
  }

  /**
   * Simulate a contract method call
   */
  async simulateContract<T = any>(
    contractType: "staking" | "rewards" | "liquidity",
    method: string,
    args: any[] = [],
    userKeypair?: Keypair
  ): Promise<ContractCallResult<T>> {
    try {
      const contract = this.getContract(contractType);
      const publicKey =
        userKeypair?.publicKey() || Keypair.random().publicKey();
      const sourceAccount = await this.server.getAccount(publicKey);

      // Build the contract call operation
      const operation = contract.call(
        method,
        ...args.map((arg) => this.convertToScVal(arg))
      );

      // Build transaction
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: "100000",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate the transaction
      const simulationResponse = await this.server.simulateTransaction(
        transaction
      );

      if (SorobanRpc.Api.isSimulationError(simulationResponse)) {
        const error = `Simulation failed: ${simulationResponse.error}`;
        console.error("❌ [SorobanService] Simulation error:", error);
        return { success: false, error };
      }

      const result = simulationResponse.result?.retval
        ? scValToNative(simulationResponse.result.retval)
        : null;
      console.log("✅ [SorobanService] Simulation successful:", {
        contractType,
        method,
        result,
      });

      return { success: true, data: result };
    } catch (error: any) {
      console.error("❌ [SorobanService] Simulation failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a contract method call
   */
  async callContract<T = any>(
    contractType: "staking" | "rewards" | "liquidity",
    method: string,
    args: any[] = [],
    userKeypair: Keypair,
    options: TransactionOptions = {}
  ): Promise<ContractCallResult<T>> {
    try {
      const contract = this.getContract(contractType);
      const sourceAccount = await this.server.getAccount(
        userKeypair.publicKey()
      );

      // Build the contract call operation
      const operation = contract.call(
        method,
        ...args.map((arg) => this.convertToScVal(arg))
      );

      // Build transaction
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: options.fee || "100000",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(operation)
        .setTimeout(options.timeout || 30)
        .build();

      // Simulate first if not explicitly disabled
      if (options.simulate !== false) {
        const simulationResponse = await this.server.simulateTransaction(
          transaction
        );
        if (SorobanRpc.Api.isSimulationError(simulationResponse)) {
          return {
            success: false,
            error: `Simulation failed: ${simulationResponse.error}`,
          };
        }
      }

      // Sign and submit transaction
      transaction.sign(userKeypair);
      const submitResponse = await this.server.sendTransaction(transaction);

      if (submitResponse.status === "PENDING") {
        // Wait for transaction to be confirmed
        let getResponse = await this.server.getTransaction(submitResponse.hash);
        let attempts = 0;
        const maxAttempts = 10;

        while (getResponse.status === "NOT_FOUND" && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          getResponse = await this.server.getTransaction(submitResponse.hash);
          attempts++;
        }

        if (getResponse.status === "SUCCESS") {
          const result = getResponse.returnValue
            ? scValToNative(getResponse.returnValue)
            : null;
          console.log("✅ [SorobanService] Transaction successful:", {
            contractType,
            method,
            hash: submitResponse.hash,
            result,
          });

          return {
            success: true,
            data: result,
            transactionHash: submitResponse.hash,
            ledger: getResponse.ledger,
          };
        } else {
          const error = `Transaction failed: ${getResponse.status}`;
          console.error("❌ [SorobanService] Transaction failed:", error);
          return { success: false, error };
        }
      } else {
        const error = `Transaction submission failed: ${submitResponse.status}`;
        console.error("❌ [SorobanService] Submission failed:", error);
        return { success: false, error };
      }
    } catch (error: any) {
      console.error("❌ [SorobanService] Contract call failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get account information
   */
  async getAccount(publicKey: string): Promise<any> {
    try {
      console.log("🔍 [SorobanService] Loading account:", publicKey);
      const account = await this.server.getAccount(publicKey);
      return account;
    } catch (error: any) {
      console.error("❌ [SorobanService] Failed to load account:", error);
      throw error;
    }
  }

  /**
   * Get latest ledger information
   */
  async getLatestLedger(): Promise<any> {
    try {
      const ledger = await this.server.getLatestLedger();
      return ledger;
    } catch (error: any) {
      console.error("❌ [SorobanService] Failed to get latest ledger:", error);
      throw error;
    }
  }

  /**
   * Build an unsigned Soroban contract invocation transaction
   * This transaction can be signed by the user's wallet
   * Loads account and simulates DIRECTLY from Soroban RPC (no backend)
   */
  async buildContractTransaction(
    contractType: "staking" | "rewards" | "liquidity",
    method: string,
    args: any[],
    userPublicKey: string,
    options: TransactionOptions = {}
  ): Promise<{ transaction: any; simulationResult?: any }> {
    try {
      console.log(
        `🔨 [SorobanService] Building contract transaction DIRECTLY:`,
        {
          contractType,
          method,
          args,
          userPublicKey,
        }
      );
      const contract = this.getContract(contractType);
      // Load account DIRECTLY from Soroban RPC (no backend)
      console.log(
        "🌐 [SorobanService] Loading account DIRECTLY from Soroban RPC..."
      );
      const sourceAccount = await this.server.getAccount(userPublicKey);
      console.log(
        "✅ [SorobanService] Account loaded:",
        sourceAccount.accountId()
      );

      // Build the contract call operation using proper SDK types
      console.log("📝 [SorobanService] Raw args:", args);
      console.log(
        "📝 [SorobanService] Arg types:",
        args.map((a) => typeof a)
      );

      // Import xdr for direct type creation
      const { xdr: XDR } = await import("@stellar/stellar-sdk");

      const scArgs = args.map((arg, index) => {
        console.log(`Converting arg[${index}]:`, arg, `(type: ${typeof arg})`);

        // Address strings (user or contract addresses)
        if (
          typeof arg === "string" &&
          arg.length === 56 &&
          (arg.startsWith("G") || arg.startsWith("C"))
        ) {
          const addrScVal = Address.fromString(arg).toScVal();
          console.log(`✅ Arg[${index}] Address converted:`, addrScVal);
          return addrScVal;
        }

        // String numbers (amounts) - convert to i128
        if (typeof arg === "string" && /^\d+$/.test(arg)) {
          const bigIntVal = BigInt(arg);
          const i128ScVal = nativeToScVal(bigIntVal, { type: "i128" });
          console.log(
            `✅ Arg[${index}] i128 converted from string "${arg}":`,
            i128ScVal
          );
          return i128ScVal;
        }

        // Numbers - convert to u64
        if (typeof arg === "number") {
          const u64ScVal = nativeToScVal(arg, { type: "u64" });
          console.log(
            `✅ Arg[${index}] u64 converted from number ${arg}:`,
            u64ScVal
          );
          return u64ScVal;
        }

        // BigInt - convert to i128
        if (typeof arg === "bigint") {
          const i128ScVal = nativeToScVal(arg, { type: "i128" });
          console.log(
            `✅ Arg[${index}] i128 converted from bigint:`,
            i128ScVal
          );
          return i128ScVal;
        }

        // Already a ScVal
        if (arg && typeof arg === "object" && arg._switch !== undefined) {
          console.log(`✅ Arg[${index}] already ScVal:`, arg);
          return arg;
        }

        // Unknown type
        console.error(`❌ Arg[${index}] UNKNOWN TYPE:`, typeof arg, arg);
        throw new Error(
          `Cannot convert argument ${index} of type ${typeof arg}: ${arg}`
        );
      });

      console.log("✅ [SorobanService] All args converted to ScVal");
      console.log("📋 [SorobanService] Final ScVal args:", scArgs);

      const operation = contract.call(method, ...scArgs);

      // Get dynamic fee from RPC
      const recommendedFee = await this.server
        .getFeeStats()
        .then((feeStats) => feeStats.sorobanInclusionFee.p70);
      console.log(
        "💰 [SorobanService] Using dynamic Soroban fee (p70):",
        recommendedFee
      );

      // Build transaction for simulation first
      let transaction = new TransactionBuilder(sourceAccount, {
        fee: recommendedFee.toString(),
        networkPassphrase: Networks.PUBLIC,
      })
        .addOperation(operation)
        .setTimeout(options.timeout || 180)
        .build();

      console.log("🔍 [SorobanService] Simulating transaction directly...");
      console.log("📋 [SorobanService] Transaction XDR:", transaction.toXDR());

      // Simulate directly using Soroban RPC
      let simulationResponse;
      try {
        simulationResponse = await this.server.simulateTransaction(transaction);
      } catch (simError: any) {
        // Handle "Bad union switch" and other XDR parsing errors
        if (simError.message?.includes("Bad union switch")) {
          console.error(
            "❌ [SorobanService] XDR parsing error during simulation (Bad union switch):",
            simError.message
          );
          throw new Error(
            "Transaction parameter type mismatch. Please ensure all arguments are in the correct format. " +
              "Error details: " +
              simError.message
          );
        }
        throw simError;
      }

      if (SorobanRpc.Api.isSimulationError(simulationResponse)) {
        const error = `Simulation failed: ${simulationResponse.error}`;
        console.error("❌ [SorobanService] Simulation error:", error);
        throw new Error(error);
      }

      console.log("✅ [SorobanService] Simulation successful");

      // Log auth entries for debugging
      const authCount = simulationResponse.result?.auth?.length || 0;
      console.log("📋 [SorobanService] Simulation returned:", {
        hasAuth: authCount > 0,
        authEntries: authCount,
        cost: simulationResponse.cost,
        minResourceFee: simulationResponse.minResourceFee,
      });

      if (authCount === 0) {
        console.warn(
          "⚠️ [SorobanService] WARNING: No auth entries in simulation! This may cause txMalformed."
        );
      }

      // Use assembleTransaction to add auth and resource data
      transaction = SorobanRpc.assembleTransaction(
        transaction,
        simulationResponse
      ).build();

      // Log assembled transaction details
      const ops = transaction.operations as any[];
      const invokeOp = ops[0];
      const assembledAuthCount = invokeOp?.auth?.length || 0;

      console.log("✅ [SorobanService] Transaction assembled:", {
        fee: transaction.fee,
        authEntries: assembledAuthCount,
        hasAuth: assembledAuthCount > 0,
      });

      if (assembledAuthCount === 0) {
        console.error(
          "❌ [SorobanService] CRITICAL: Assembled transaction has NO auth entries!"
        );
        throw new Error(
          "Transaction assembly failed: No authorization entries added"
        );
      }

      console.log(
        "✅ [SorobanService] Transaction built and ready for signing"
      );

      return {
        transaction,
        simulationResult: null,
      };
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Failed to build contract transaction:",
        error
      );
      throw error;
    }
  }

  /**
   * Simulate transaction via backend API to avoid CORS
   */
  private async simulateViaBackend(txXdr: string): Promise<any> {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      if (!backendUrl) {
        throw new Error(
          "❌ [SorobanService] Missing required environment variable: REACT_APP_BACKEND_URL. Please set it in your .env file."
        );
      }
      const response = await fetch(`${backendUrl}/api/soroban/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionXdr: txXdr }),
      });

      if (!response.ok) {
        throw new Error(`Backend simulation failed: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.warn("Backend simulation not available:", error);
      return null;
    }
  }

  /**
   * Submit a signed contract transaction DIRECTLY to Soroban RPC
   */
  async submitSignedTransaction(
    signedTxXdr: string
  ): Promise<ContractCallResult> {
    try {
      console.log(
        "📤 [SorobanService] Submitting signed transaction DIRECTLY to Soroban RPC..."
      );

      const { TransactionBuilder } = await import("@stellar/stellar-sdk");
      const transaction = TransactionBuilder.fromXDR(
        signedTxXdr,
        this.getNetworkPassphrase()
      );

      console.log(
        "📨 [SorobanService] Sending to Soroban RPC:",
        this.contractConfig.rpcUrl
      );
      const submitResponse = await this.server.sendTransaction(transaction);

      console.log("📡 [SorobanService] Submit response:", {
        status: submitResponse.status,
        hash: submitResponse.hash,
      });

      if (submitResponse.status === "ERROR") {
        const errorDetail =
          (submitResponse as any).errorResult || "Transaction failed";
        console.error("❌ [SorobanService] Transaction ERROR:", errorDetail);
        return {
          success: false,
          error: `Transaction failed: ${JSON.stringify(errorDetail)}`,
        };
      }

      if (
        submitResponse.status === "PENDING" ||
        submitResponse.status === "DUPLICATE"
      ) {
        console.log(
          "⏳ [SorobanService] Transaction pending, waiting for confirmation..."
        );

        // Wait for confirmation
        let getResponse: any;
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds max wait

        // Initial check with error handling
        try {
          getResponse = await this.server.getTransaction(submitResponse.hash);
        } catch (parseError: any) {
          // If it's a parsing error but not NOT_FOUND, transaction likely succeeded
          if (parseError.message?.includes("Bad union switch")) {
            console.log(
              "✅ [SorobanService] Transaction succeeded but response parsing failed (Bad union switch)"
            );
            return {
              success: true,
              data: null,
              transactionHash: submitResponse.hash,
            };
          }
          throw parseError;
        }

        while (getResponse.status === "NOT_FOUND" && attempts < maxAttempts) {
          console.log(
            `⏳ [SorobanService] Polling... (${attempts + 1}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));

          try {
            getResponse = await this.server.getTransaction(submitResponse.hash);
          } catch (parseError: any) {
            // If it's a parsing error but not NOT_FOUND, transaction likely succeeded
            if (parseError.message?.includes("Bad union switch")) {
              console.log(
                "✅ [SorobanService] Transaction succeeded but response parsing failed (Bad union switch)"
              );
              return {
                success: true,
                data: null,
                transactionHash: submitResponse.hash,
              };
            }
            throw parseError;
          }

          attempts++;
        }

        if (getResponse.status === "SUCCESS") {
          const { scValToNative } = await import("@stellar/stellar-sdk");
          const result = getResponse.returnValue
            ? scValToNative(getResponse.returnValue)
            : null;

          console.log("✅ [SorobanService] Transaction confirmed!", {
            hash: submitResponse.hash,
            ledger: getResponse.ledger,
            result,
          });

          return {
            success: true,
            data: result,
            transactionHash: submitResponse.hash,
            ledger: getResponse.ledger,
          };
        } else if (getResponse.status === "FAILED") {
          const error = `Transaction failed on-chain: ${getResponse.status}`;
          console.error("❌ [SorobanService]", error);
          return { success: false, error };
        } else {
          const error = `Transaction status: ${getResponse.status}`;
          console.warn("⚠️ [SorobanService]", error);
          return { success: false, error };
        }
      }

      const error = `Unexpected submission status: ${submitResponse.status}`;
      console.error("❌ [SorobanService]", error);
      return { success: false, error };
    } catch (error: any) {
      console.error("❌ [SorobanService] Direct submission failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check for Soroban RPC connection
   */
  async healthCheck(): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      await this.server.getLatestLedger();
      const latency = Date.now() - startTime;

      console.log("✅ [SorobanService] Health check passed:", { latency });
      return { success: true, latency };
    } catch (error: any) {
      console.error("❌ [SorobanService] Health check failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert JavaScript value to ScVal
   */
  private convertToScVal(value: any): any {
    // Handle already-converted ScVal objects (don't double-convert!)
    if (value && typeof value === "object" && value._switch !== undefined) {
      console.log(
        "✅ [SorobanService] ScVal already converted, returning as-is"
      );
      return value;
    }

    // Handle Address objects (Stellar SDK)
    if (value instanceof Address) {
      console.log(
        "📬 [SorobanService] Address object detected, converting to ScVal"
      );
      return value.toScVal();
    }

    // Handle Stellar addresses: both user addresses (G) and contract addresses (C)
    // All are 56 characters long
    if (typeof value === "string" && value.length === 56) {
      if (value.startsWith("G")) {
        // User address (account)
        console.log(
          "👤 [SorobanService] Converting user address to ScVal:",
          value
        );
        return Address.fromString(value).toScVal();
      } else if (value.startsWith("C")) {
        // Contract address
        console.log(
          "📄 [SorobanService] Converting contract address to ScVal:",
          value
        );
        return new Contract(value).address().toScVal();
      }
    }

    // Handle string numbers (amounts in stroops) - convert to i128
    if (typeof value === "string" && /^\d+$/.test(value)) {
      console.log("💰 [SorobanService] Converting amount to i128:", value);
      return nativeToScVal(BigInt(value), { type: "i128" });
    }

    // Handle regular numbers (durations, etc) - convert to u64
    // NOTE: Many Soroban contracts use u64 for durations/periods, not u32
    // If you need u32 or a different type, explicitly pass a typed ScVal instead
    if (typeof value === "number") {
      console.log("🔢 [SorobanService] Converting number to u64:", value);
      return nativeToScVal(value, { type: "u64" });
    }

    // Handle bigint - convert to i128
    if (typeof value === "bigint") {
      console.log("🔢 [SorobanService] Converting bigint to i128:", value);
      return nativeToScVal(value, { type: "i128" });
    }

    // Handle boolean
    if (typeof value === "boolean") {
      return nativeToScVal(value, { type: "bool" });
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return nativeToScVal(value, { type: "vec" });
    }

    // Handle other strings as symbols
    if (typeof value === "string") {
      console.log("📝 [SorobanService] Converting string to symbol:", value);
      return nativeToScVal(value, { type: "symbol" });
    }

    // Default fallback
    return nativeToScVal(value);
  }

  /**
   * Get current network passphrase
   */
  private getNetworkPassphrase(): string {
    return this.contractConfig.network === "mainnet"
      ? Networks.PUBLIC
      : Networks.TESTNET;
  }

  /**
   * Query BLUB token balance for a user from BLUB TOKEN CONTRACT (wallet balance)
   * This queries the actual BLUB token contract (SAC), not the staking contract
   */
  async queryBlubBalance(userAddress: string): Promise<string> {
    try {
      // Get BLUB token contract address from config
      const { SOROBAN_CONFIG } = await import("../config/soroban.config");
      const blubTokenContract = SOROBAN_CONFIG.assets.blub.sorobanContract;

      if (!blubTokenContract) {
        console.error(
          "❌ [SorobanService] BLUB token contract address not configured"
        );
        return "0";
      }

      // Create contract instance for BLUB token
      const contract = new Contract(blubTokenContract);
      const account = await this.server.getAccount(userAddress);

      // Call the standard 'balance' function on the BLUB token contract
      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(
          contract.call("balance", Address.fromString(userAddress).toScVal())
        )
        .setTimeout(30)
        .build();

      const simulation: any = await this.server.simulateTransaction(
        transaction
      );

      if (simulation.result?.retval) {
        const balance = scValToNative(simulation.result.retval);
        const balanceStr = (Number(balance) / 10000000).toFixed(7);
        return balanceStr;
      }

      return "0";
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Failed to query BLUB wallet balance:",
        error
      );
      return "0";
    }
  }

  /**
   * Query BLUB token total supply from staking contract
   */
  async queryBlubTotalSupply(): Promise<string> {
    try {
      console.log("🔍 [SorobanService] Querying BLUB total supply...");

      const contract = this.getContract("staking");
      const dummyAddress =
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
      const account = await this.server
        .getAccount(dummyAddress)
        .catch(async () => {
          const keys = Keypair.random();
          return await this.server
            .getAccount(keys.publicKey())
            .catch(() => null);
        });

      if (!account) return "0";

      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(contract.call("blub_total_supply"))
        .setTimeout(30)
        .build();

      const simulation: any = await this.server.simulateTransaction(
        transaction
      );

      if (simulation.result?.retval) {
        const supply = scValToNative(simulation.result.retval);
        return (Number(supply) / 10000000).toFixed(7);
      }

      return "0";
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Failed to query BLUB total supply:",
        error
      );
      return "0";
    }
  }

  /**
   * Query comprehensive user staking info from the contract
   * This replaces the deprecated queryAllBlubRestakes function
   * Returns: total_staked_blub, unstaking_available, accumulated_rewards, pending_rewards, etc.
   */
  async queryUserStakingInfo(userAddress: string): Promise<any> {
    try {
      console.log(
        "🔍 [SorobanService] Querying user staking info for:",
        userAddress
      );

      const contract = this.getContract("staking");
      const account = await this.server.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(
          contract.call(
            "get_user_staking_info",
            Address.fromString(userAddress).toScVal()
          )
        )
        .setTimeout(30)
        .build();

      const simulation: any = await this.server.simulateTransaction(
        transaction
      );

      if (simulation.result?.retval) {
        const info = scValToNative(simulation.result.retval);
        console.log("✅ [SorobanService] User staking info:", info);

        // Convert stroops to tokens
        return {
          total_staked_blub: info.total_staked_blub
            ? (Number(info.total_staked_blub) / 10000000).toFixed(7)
            : "0",
          unstaking_available: info.unstaking_available
            ? (Number(info.unstaking_available) / 10000000).toFixed(7)
            : "0",
          accumulated_rewards: info.accumulated_rewards
            ? (Number(info.accumulated_rewards) / 10000000).toFixed(7)
            : "0",
          pending_rewards: info.pending_rewards
            ? (Number(info.pending_rewards) / 10000000).toFixed(7)
            : "0",
          total_locked_entries: info.total_locked_entries || 0,
          total_unlocked_entries: info.total_unlocked_entries || 0,
        };
      }

      return null;
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Failed to query user staking info:",
        error
      );
      return null;
    }
  }

  /**
   * DEPRECATED: Use queryUserStakingInfo instead
   * Query BLUB restake count for a user
   */
  async queryBlubRestakeCount(userAddress: string): Promise<number> {
    try {
      console.log(
        "⚠️ [SorobanService] DEPRECATED: Use queryUserStakingInfo instead"
      );
      const contract = this.getContract("staking");
      const account = await this.server.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(
          contract.call(
            "get_blub_restake_count",
            Address.fromString(userAddress).toScVal()
          )
        )
        .setTimeout(30)
        .build();

      const simulation: any = await this.server.simulateTransaction(
        transaction
      );

      if (simulation.result?.retval) {
        const count = scValToNative(simulation.result.retval);
        return Number(count) || 0;
      }

      return 0;
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Failed to query BLUB restake count:",
        error
      );
      return 0;
    }
  }

  /**
   * DEPRECATED: Use queryUserStakingInfo instead
   * Query BLUB restake by index
   */
  async queryBlubRestakeByIndex(
    userAddress: string,
    index: number
  ): Promise<any> {
    try {
      console.log(
        "⚠️ [SorobanService] DEPRECATED: Use queryUserStakingInfo instead"
      );
      const contract = this.getContract("staking");
      const account = await this.server.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(
          contract.call(
            "get_blub_restake_by_index",
            Address.fromString(userAddress).toScVal(),
            nativeToScVal(index, { type: "u32" })
          )
        )
        .setTimeout(30)
        .build();

      const simulation: any = await this.server.simulateTransaction(
        transaction
      );

      if (simulation.result?.retval) {
        return scValToNative(simulation.result.retval);
      }

      return null;
    } catch (error: any) {
      console.error(
        `❌ [SorobanService] Failed to query BLUB restake ${index}:`,
        error
      );
      return null;
    }
  }

  /**
   * DEPRECATED: Use queryUserStakingInfo instead
   * Query all BLUB restakes for a user
   */
  async queryAllBlubRestakes(userAddress: string): Promise<any[]> {
    try {
      console.log(
        "⚠️ [SorobanService] DEPRECATED: Use queryUserStakingInfo instead"
      );
      const count = await this.queryBlubRestakeCount(userAddress);
      if (count === 0) return [];

      const restakes = [];
      for (let i = 0; i < count; i++) {
        const restake = await this.queryBlubRestakeByIndex(userAddress, i);
        if (restake) {
          restakes.push({
            ...restake,
            amount: restake.amount
              ? (Number(restake.amount) / 10000000).toFixed(7)
              : "0",
          });
        }
      }

      return restakes;
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Failed to query all BLUB restakes:",
        error
      );
      return [];
    }
  }

  /**
   * Query user LP position
   */
  async queryUserLpPosition(userAddress: string, poolId: string): Promise<any> {
    try {
      console.log(
        "🔍 [SorobanService] Querying LP position for:",
        userAddress,
        poolId
      );

      const contract = this.getContract("liquidity");
      const account = await this.server.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(
          contract.call(
            "get_user_lp",
            Address.fromString(userAddress).toScVal(),
            nativeToScVal(poolId, { type: "string" })
          )
        )
        .setTimeout(30)
        .build();

      const simulation: any = await this.server.simulateTransaction(
        transaction
      );

      if (simulation.result?.retval) {
        const position = scValToNative(simulation.result.retval);
        console.log("✅ [SorobanService] LP position:", position);
        return {
          aqua_amount: position.aqua_amount
            ? (Number(position.aqua_amount) / 10000000).toFixed(7)
            : "0",
          blub_amount: position.blub_amount
            ? (Number(position.blub_amount) / 10000000).toFixed(7)
            : "0",
          lp_shares: position.lp_shares
            ? (Number(position.lp_shares) / 10000000).toFixed(7)
            : "0",
        };
      }

      return null;
    } catch (error: any) {
      console.error("❌ [SorobanService] Failed to query LP position:", error);
      return null;
    }
  }

  /**
   * Query POL (Protocol Owned Liquidity) info from staking contract
   * Uses the correct contract function: get_protocol_owned_liquidity
   */
  async queryPolInfo(): Promise<any> {
    try {
      console.log(
        "🔍 [SorobanService] Querying POL info from staking contract..."
      );

      const contract = this.getContract("staking");
      const dummyAddress =
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

      const account = await this.server
        .getAccount(dummyAddress)
        .catch(async () => {
          // Use any funded address for simulation
          const keys = Keypair.random();
          return await this.server
            .getAccount(keys.publicKey())
            .catch(() => null);
        });

      if (!account) {
        console.warn("⚠️ [SorobanService] Could not get account for POL query");
        return null;
      }

      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(contract.call("get_protocol_owned_liquidity"))
        .setTimeout(30)
        .build();

      const simulation: any = await this.server.simulateTransaction(
        transaction
      );

      if (simulation.result?.retval) {
        const result = scValToNative(simulation.result.retval);
        console.log("✅ [SorobanService] POL info:", result);

        // Convert stroops to tokens for display
        return {
          total_aqua_contributed: result.total_aqua_contributed
            ? (Number(result.total_aqua_contributed) / 10000000).toFixed(7)
            : "0",
          total_blub_contributed: result.total_blub_contributed
            ? (Number(result.total_blub_contributed) / 10000000).toFixed(7)
            : "0",
          aqua_blub_lp_position: result.aqua_blub_lp_position
            ? (Number(result.aqua_blub_lp_position) / 10000000).toFixed(7)
            : "0",
          total_pol_rewards_earned: result.total_pol_rewards_earned
            ? (Number(result.total_pol_rewards_earned) / 10000000).toFixed(7)
            : "0",
          last_reward_claim: result.last_reward_claim || 0,
          ice_voting_power_used: result.ice_voting_power_used
            ? (Number(result.ice_voting_power_used) / 10000000).toFixed(7)
            : "0",
        };
      }

      return null;
    } catch (error: any) {
      console.error("❌ [SorobanService] Failed to query POL info:", error);
      return null;
    }
  }

  /**
   * Query global state from staking contract
   */
  async queryGlobalState(): Promise<any> {
    try {
      console.log(
        "🔍 [SorobanService] Querying global state from staking contract..."
      );

      const contract = this.getContract("staking");
      const dummyAddress =
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

      const account = await this.server
        .getAccount(dummyAddress)
        .catch(async () => {
          // Use any funded address for simulation
          const keys = Keypair.random();
          return await this.server
            .getAccount(keys.publicKey())
            .catch(() => null);
        });

      if (!account) {
        console.warn(
          "⚠️ [SorobanService] Could not get account for global state query"
        );
        return null;
      }

      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(contract.call("get_global_state"))
        .setTimeout(30)
        .build();

      const simulation: any = await this.server.simulateTransaction(
        transaction
      );

      if (simulation.result?.retval) {
        const result = scValToNative(simulation.result.retval);
        console.log("✅ [SorobanService] Global state:", result);
        return result;
      }

      return null;
    } catch (error: any) {
      console.error("❌ [SorobanService] Failed to query global state:", error);
      return null;
    }
  }

  /**
   * Query reward state from staking contract
   */
  async queryRewardState(): Promise<any> {
    try {
      console.log(
        "🔍 [SorobanService] Querying reward state from staking contract..."
      );

      const contract = this.getContract("staking");
      const dummyAddress =
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

      const account = await this.server
        .getAccount(dummyAddress)
        .catch(async () => {
          const keys = Keypair.random();
          return await this.server
            .getAccount(keys.publicKey())
            .catch(() => null);
        });

      if (!account) {
        console.warn(
          "⚠️ [SorobanService] Could not get account for reward state query"
        );
        return null;
      }

      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(contract.call("get_reward_state_view"))
        .setTimeout(30)
        .build();

      const simulation: any = await this.server.simulateTransaction(
        transaction
      );

      if (simulation.result?.retval) {
        const raw = scValToNative(simulation.result.retval);
        const result = {
          total_rewards_added: Number(raw.total_rewards_added) / 10000000,
          total_rewards_claimed: Number(raw.total_rewards_claimed) / 10000000,
          total_staked: Number(raw.total_staked) / 10000000,
          last_update_time: Number(raw.last_update_time),
          reward_per_token_stored: Number(raw.reward_per_token_stored),
        };
        console.log("✅ [SorobanService] Reward state:", result);
        return result;
      }

      return null;
    } catch (error: any) {
      console.error("❌ [SorobanService] Failed to query reward state:", error);
      return null;
    }
  }

  /**
   * Query the next unlock time for a user's locked entries
   * Returns the earliest unlock timestamp (seconds) or null if no active locks
   */
  async queryNextUnlockTime(userAddress: string): Promise<number | null> {
    try {
      const contract = this.getContract("staking");
      const account = await this.server.getAccount(userAddress);

      // Get lock count
      const countTx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(
          contract.call(
            "get_user_lock_count",
            Address.fromString(userAddress).toScVal()
          )
        )
        .setTimeout(30)
        .build();

      const countSim: any = await this.server.simulateTransaction(countTx);
      const lockCount = countSim.result?.retval
        ? scValToNative(countSim.result.retval)
        : 0;

      if (lockCount === 0) return null;

      // Get config for cooldown
      const configTx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(contract.call("get_config"))
        .setTimeout(30)
        .build();

      const configSim: any = await this.server.simulateTransaction(configTx);
      const config = configSim.result?.retval
        ? scValToNative(configSim.result.retval)
        : null;

      const cooldown = config?.unstake_cooldown_seconds
        ? Number(config.unstake_cooldown_seconds)
        : 864000;

      // Find earliest unlock time from active (non-unlocked) entries
      let earliestUnlock: number | null = null;

      for (let i = 0; i < lockCount; i++) {
        const lockTx = new TransactionBuilder(account, {
          fee: "100",
          networkPassphrase: this.getNetworkPassphrase(),
        })
          .addOperation(
            contract.call(
              "get_user_lock_by_index",
              Address.fromString(userAddress).toScVal(),
              nativeToScVal(i, { type: "u32" })
            )
          )
          .setTimeout(30)
          .build();

        const lockSim: any = await this.server.simulateTransaction(lockTx);
        if (lockSim.result?.retval) {
          const entry = scValToNative(lockSim.result.retval);
          if (!entry.unlocked && entry.blub_locked > 0) {
            const unlockTime =
              Number(entry.lock_timestamp) + cooldown;
            if (earliestUnlock === null || unlockTime < earliestUnlock) {
              earliestUnlock = unlockTime;
            }
          }
        }
      }

      return earliestUnlock;
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Failed to query next unlock time:",
        error
      );
      return null;
    }
  }

  /**
   * Stake BLUB tokens (restake)
   * Calls stake contract function
   */
  async stakeBlub(
    userAddress: string,
    amount: number,
    durationDays: number
  ): Promise<ContractCallResult> {
    try {
      console.log("🟦 [SorobanService] Staking BLUB:", {
        userAddress,
        amount,
        durationDays,
      });

      // Build contract transaction
      const { transaction } = await this.buildContractTransaction(
        "staking",
        "stake", // Contract function for BLUB staking (restaking)
        [
          userAddress, // user address
          amount, // amount in stroops
          durationDays, // duration in days
        ],
        userAddress
      );

      console.log("🟦 [SorobanService] BLUB stake transaction built");
      console.log("Transaction XDR:", transaction.toXDR());

      return {
        success: true,
        data: { transaction },
        transactionHash: transaction.hash().toString("hex"),
      };
    } catch (error: any) {
      console.error("❌ [SorobanService] Error staking BLUB:", error);
      return {
        success: false,
        error: error.message || "Failed to stake BLUB",
      };
    }
  }

  /**
   * Get contract configuration
   */
  getConfig(): ContractConfig {
    return this.contractConfig;
  }

  /**
   * Get RPC server instance
   */
  getServer(): SorobanRpc.Server {
    return this.server;
  }

  // ============================================================================
  // CONTRACT DATA FETCHING METHODS (for displaying balances and stats)
  // ============================================================================

  /**
   * Get comprehensive user staking info
   * Includes: total staked BLUB, unstaking available, rewards
   */
  async getUserStakingInfo(userAddress: string): Promise<ContractCallResult> {
    try {
      console.log(
        "📊 [SorobanService] Getting user staking info:",
        userAddress
      );

      const result = await this.simulateContract(
        "staking",
        "get_user_staking_info",
        [userAddress]
      );

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get user staking info failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get BLUB token balance for a user
   */
  async getBlubBalance(userAddress: string): Promise<ContractCallResult> {
    try {
      console.log("💎 [SorobanService] Getting BLUB balance:", userAddress);

      const result = await this.simulateContract("staking", "blub_balance", [
        userAddress,
      ]);

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get BLUB balance failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's lock count
   */
  async getUserLockCount(userAddress: string): Promise<ContractCallResult> {
    try {
      console.log("🔢 [SorobanService] Getting user lock count:", userAddress);

      const result = await this.simulateContract(
        "staking",
        "get_user_lock_count",
        [userAddress]
      );

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get user lock count failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get specific lock entry by index
   */
  async getUserLockByIndex(
    userAddress: string,
    index: number
  ): Promise<ContractCallResult> {
    try {
      console.log("🔐 [SorobanService] Getting lock by index:", {
        userAddress,
        index,
      });

      const result = await this.simulateContract(
        "staking",
        "get_user_lock_by_index",
        [userAddress, index]
      );

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get lock by index failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get global staking state
   */
  async getGlobalState(): Promise<ContractCallResult> {
    try {
      console.log("🌍 [SorobanService] Getting global state");

      const result = await this.simulateContract(
        "staking",
        "get_global_state",
        []
      );

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get global state failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Protocol Owned Liquidity info
   */
  async getProtocolOwnedLiquidity(): Promise<ContractCallResult> {
    try {
      console.log("💧 [SorobanService] Getting POL info");

      const result = await this.simulateContract(
        "staking",
        "get_protocol_owned_liquidity",
        []
      );

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get POL info failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's total POL contribution
   */
  async getUserPolContribution(
    userAddress: string
  ): Promise<ContractCallResult> {
    try {
      console.log(
        "💰 [SorobanService] Getting user POL contribution:",
        userAddress
      );

      const result = await this.simulateContract(
        "staking",
        "get_user_pol_contribution",
        [userAddress]
      );

      return result;
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Get user POL contribution failed:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate user rewards
   */
  async calculateUserRewards(userAddress: string): Promise<ContractCallResult> {
    try {
      console.log("🎁 [SorobanService] Calculating user rewards:", userAddress);

      const result = await this.simulateContract(
        "staking",
        "calculate_user_rewards",
        [userAddress]
      );

      return result;
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Calculate user rewards failed:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's LP position
   */
  async getUserLpPosition(
    userAddress: string,
    poolId: string
  ): Promise<ContractCallResult> {
    try {
      console.log("🏊 [SorobanService] Getting user LP position:", {
        userAddress,
        poolId,
      });

      const result = await this.simulateContract(
        "liquidity",
        "get_user_position",
        [userAddress, poolId]
      );

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get user LP position failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's pool list
   */
  async getUserPools(userAddress: string): Promise<ContractCallResult> {
    try {
      console.log("📋 [SorobanService] Getting user pools:", userAddress);

      const result = await this.simulateContract(
        "liquidity",
        "get_user_pools",
        [userAddress]
      );

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get user pools failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get claimable rewards for user
   */
  async getClaimableRewards(userAddress: string): Promise<ContractCallResult> {
    try {
      console.log(
        "💵 [SorobanService] Getting claimable rewards:",
        userAddress
      );

      const result = await this.simulateContract(
        "rewards",
        "get_claimable_rewards",
        [userAddress]
      );

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get claimable rewards failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user reward info
   */
  async getUserRewardInfo(userAddress: string): Promise<ContractCallResult> {
    try {
      console.log("📈 [SorobanService] Getting user reward info:", userAddress);

      const result = await this.simulateContract(
        "rewards",
        "get_user_reward_info",
        [userAddress]
      );

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get user reward info failed:", error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // ICE Token Balance Queries
  // ============================================================================

  /**
   * Get all ICE token balances from staking contract
   * Returns balances for all 4 ICE token types:
   * - ICE: Base ICE token (tracks locked AQUA)
   * - governICE: For governance voting
   * - upvoteICE: For liquidity voting (upvotes)
   * - downvoteICE: For liquidity voting (downvotes)
   *
   * @see https://docs.aqua.network/ice/ice-tokens-locking-aqua-and-getting-benefits
   */
  async getAllIceBalances(): Promise<ContractCallResult<{
    ice: string;
    governIce: string;
    upvoteIce: string;
    downvoteIce: string;
  }>> {
    try {
      console.log("🧊 [SorobanService] Getting all ICE balances from contract");

      const result = await this.simulateContract(
        "staking",
        "get_all_ice_balances",
        []
      );

      if (result.success && result.data) {
        // Contract returns tuple: (i128, i128, i128, i128)
        // Order: ice, govern_ice, upvote_ice, downvote_ice
        const data = result.data;
        const formatBalance = (val: any) =>
          (Number(val || 0) / 10000000).toFixed(7);

        return {
          success: true,
          data: {
            ice: formatBalance(Array.isArray(data) ? data[0] : data.ice),
            governIce: formatBalance(
              Array.isArray(data) ? data[1] : data.govern_ice
            ),
            upvoteIce: formatBalance(
              Array.isArray(data) ? data[2] : data.upvote_ice
            ),
            downvoteIce: formatBalance(
              Array.isArray(data) ? data[3] : data.downvote_ice
            ),
          },
        };
      }

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get all ICE balances failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get upvoteICE balance from staking contract
   * Used for checking available voting power for liquidity voting
   */
  async getUpvoteIceBalance(): Promise<ContractCallResult<string>> {
    try {
      console.log("🗳️ [SorobanService] Getting upvoteICE balance");

      const result = await this.simulateContract(
        "staking",
        "get_upvote_ice_balance",
        []
      );

      if (result.success && result.data !== undefined) {
        const balance = (Number(result.data) / 10000000).toFixed(7);
        return { success: true, data: balance };
      }

      return result;
    } catch (error: any) {
      console.error("❌ [SorobanService] Get upvoteICE balance failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending AQUA amount available for ICE locking
   * This is AQUA accumulated from staking that can be locked to generate ICE
   */
  async getPendingAquaForIce(): Promise<ContractCallResult<string>> {
    try {
      console.log("💧 [SorobanService] Getting pending AQUA for ICE");

      const result = await this.simulateContract(
        "staking",
        "get_pending_aqua_for_ice",
        []
      );

      if (result.success && result.data !== undefined) {
        const amount = (Number(result.data) / 10000000).toFixed(7);
        return { success: true, data: amount };
      }

      return result;
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Get pending AQUA for ICE failed:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch comprehensive user data for UI display
   * Returns all staking, balance, LP, and reward info in one call
   */
  async fetchUserComprehensiveData(userAddress: string): Promise<{
    stakingInfo: any;
    blubBalance: string;
    locks: any[];
    polInfo: any;
    rewards: any;
    lpPositions: any[];
  }> {
    try {
      console.log(
        "🔄 [SorobanService] Fetching comprehensive user data:",
        userAddress
      );

      // Fetch all data in parallel for better performance
      const [
        stakingInfoResult,
        blubBalanceResult,
        lockCountResult,
        polInfoResult,
        rewardsResult,
        userPoolsResult,
      ] = await Promise.all([
        this.getUserStakingInfo(userAddress),
        this.getBlubBalance(userAddress),
        this.getUserLockCount(userAddress),
        this.getProtocolOwnedLiquidity(),
        this.calculateUserRewards(userAddress),
        this.getUserPools(userAddress),
      ]);

      // Fetch individual lock entries
      const lockCount = lockCountResult.success ? lockCountResult.data : 0;
      const locks = [];
      for (let i = 0; i < lockCount; i++) {
        const lockResult = await this.getUserLockByIndex(userAddress, i);
        if (lockResult.success) {
          locks.push(lockResult.data);
        }
      }

      // Fetch LP positions for each pool
      const userPools = userPoolsResult.success ? userPoolsResult.data : [];
      const lpPositions = [];
      for (const poolId of userPools) {
        const positionResult = await this.getUserLpPosition(
          userAddress,
          poolId
        );
        if (positionResult.success) {
          lpPositions.push(positionResult.data);
        }
      }

      return {
        stakingInfo: stakingInfoResult.success ? stakingInfoResult.data : null,
        blubBalance: blubBalanceResult.success ? blubBalanceResult.data : "0",
        locks,
        polInfo: polInfoResult.success ? polInfoResult.data : null,
        rewards: rewardsResult.success ? rewardsResult.data : null,
        lpPositions,
      };
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Fetch comprehensive data failed:",
        error
      );
      throw error;
    }
  }

  // ============================================================================
  // REWARD SYSTEM V2 (Synthetix-style)
  // ============================================================================

  /**
   * Query pending BLUB rewards for a user
   * Calls get_pending_rewards(user) on staking contract
   */
  async queryPendingRewards(userAddress: string): Promise<string> {
    try {
      console.log(
        "🎁 [SorobanService] Querying pending rewards for:",
        userAddress
      );

      const contract = this.getContract("staking");
      const account = await this.server.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(
          contract.call(
            "get_pending_rewards",
            Address.fromString(userAddress).toScVal()
          )
        )
        .setTimeout(30)
        .build();

      const simulation: any = await this.server.simulateTransaction(transaction);

      if (simulation.result?.retval) {
        const pendingRewards = scValToNative(simulation.result.retval);
        const formatted = (Number(pendingRewards) / 10000000).toFixed(7);
        console.log("✅ [SorobanService] Pending rewards:", formatted);
        return formatted;
      }

      return "0";
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Failed to query pending rewards:",
        error
      );
      return "0";
    }
  }

  /**
   * Query comprehensive reward info for a user
   * Calls get_user_reward_info(user) on staking contract
   * Returns: pending_rewards, total_claimed, staked_balance, last_claim_time, can_claim, claim_available_at
   */
  async queryUserRewardInfo(userAddress: string): Promise<any> {
    try {
      console.log(
        "🎁 [SorobanService] Querying user reward info for:",
        userAddress
      );

      const contract = this.getContract("staking");
      const account = await this.server.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(
          contract.call(
            "get_user_reward_info",
            Address.fromString(userAddress).toScVal()
          )
        )
        .setTimeout(30)
        .build();

      const simulation: any = await this.server.simulateTransaction(transaction);

      if (simulation.result?.retval) {
        const info = scValToNative(simulation.result.retval);
        console.log("✅ [SorobanService] User reward info:", info);

        return {
          pending_rewards: info.pending_rewards
            ? (Number(info.pending_rewards) / 10000000).toFixed(7)
            : "0",
          total_claimed: info.total_claimed
            ? (Number(info.total_claimed) / 10000000).toFixed(7)
            : "0",
          staked_balance: info.staked_balance
            ? (Number(info.staked_balance) / 10000000).toFixed(7)
            : "0",
          last_claim_time: info.last_claim_time || 0,
          can_claim: info.can_claim || false,
          claim_available_at: info.claim_available_at || 0,
        };
      }

      return {
        pending_rewards: "0",
        total_claimed: "0",
        staked_balance: "0",
        last_claim_time: 0,
        can_claim: false,
        claim_available_at: 0,
      };
    } catch (error: any) {
      console.error(
        "❌ [SorobanService] Failed to query user reward info:",
        error
      );
      return {
        pending_rewards: "0",
        total_claimed: "0",
        staked_balance: "0",
        last_claim_time: 0,
        can_claim: false,
        claim_available_at: 0,
      };
    }
  }
}

// Export singleton instance (class is already exported above)
export const sorobanService = new SorobanService();
