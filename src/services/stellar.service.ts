import * as StellarSdk from "@stellar/stellar-sdk";

export class StellarService {
  server: StellarSdk.Horizon.Server | null = null;

  constructor() {
    this.startHorizonServer();
  }

  private startHorizonServer(): void {
    // Get required Horizon URL from environment
    const horizonUrl = process.env.REACT_APP_HORIZON_URL;
    if (!horizonUrl) {
      throw new Error(
        "❌ [StellarService] Missing required environment variable: REACT_APP_HORIZON_URL. Please set it in your .env file."
      );
    }
    this.server = new StellarSdk.Horizon.Server(horizonUrl);
    console.log("🌐 [StellarService] Initialized with Horizon:", horizonUrl);
  }

  loadAccount(publicKey: string): Promise<StellarSdk.Horizon.AccountResponse> {
    if (!this.server) {
      throw new Error("Horizon server isn't started");
    }

    console.log("🔍 [StellarService] Loading account for wallet:", {
      publicKey: publicKey,
      keyLength: publicKey?.length,
      isValidFormat: /^G[A-Z0-9]{55}$/.test(publicKey),
    });

    return this.server
      .loadAccount(publicKey)
      .then((account) => {
        console.log("✅ [StellarService] Account loaded successfully:", {
          publicKey: publicKey,
          balanceCount: account.balances?.length || 0,
          balances: account.balances?.map((b: any) => ({
            asset_type: b.asset_type,
            asset_code: b.asset_code,
            balance: b.balance,
            limit: b.limit,
            asset_issuer: b.asset_issuer,
          })),
          sequence: account.sequence,
          account_id: account.account_id,
        });
        return account;
      })
      .catch((error) => {
        console.error("❌ [StellarService] Failed to load account:", {
          publicKey: publicKey,
          error: error.message,
          errorDetails: error,
        });
        throw error;
      });
  }
}
