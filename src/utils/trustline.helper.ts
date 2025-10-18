import {
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
  Horizon,
} from "@stellar/stellar-sdk";
import {
  FREIGHTER_ID,
  FreighterModule,
  LOBSTR_ID,
  LobstrModule,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { signTransaction } from "@lobstrco/signer-extension-api";
import { walletTypes } from "../enums";
import { StellarService } from "../services/stellar.service";

export interface TrustlineSetupResult {
  hasTrustline: boolean;
  trustlineCreated: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Checks if a trust line exists for a given asset, and creates one if it doesn't
 * @param userAddress The user's Stellar wallet address
 * @param assetCode The asset code (e.g., "BLUB")
 * @param assetIssuer The asset issuer's public key
 * @param walletName The wallet type (LOBSTR or FREIGHTER)
 * @param networkType The network type (PUBLIC or TESTNET)
 * @returns TrustlineSetupResult with status and transaction details
 */
export async function ensureTrustline(
  userAddress: string,
  assetCode: string,
  assetIssuer: string,
  walletName: string,
  networkType: WalletNetwork = WalletNetwork.PUBLIC
): Promise<TrustlineSetupResult> {
  try {
    console.log(`🔍 [TrustlineHelper] Checking trustline for ${assetCode}...`, {
      userAddress,
      assetCode,
      assetIssuer,
    });

    const stellarService = new StellarService();
    const account = await stellarService.loadAccount(userAddress);

    // Check if trustline already exists
    const hasTrustline = account.balances.some(
      (balance: Horizon.HorizonApi.BalanceLine) => {
        if (balance.asset_type === "native") return false;
        const assetBalance = balance as Horizon.HorizonApi.BalanceLineAsset;
        return (
          assetBalance.asset_code === assetCode &&
          assetBalance.asset_issuer === assetIssuer
        );
      }
    );

    if (hasTrustline) {
      console.log(
        `✅ [TrustlineHelper] Trustline already exists for ${assetCode}`
      );
      return {
        hasTrustline: true,
        trustlineCreated: false,
      };
    }

    console.log(
      `⚠️ [TrustlineHelper] No trustline found for ${assetCode}. Creating one...`
    );

    // Create the asset
    const asset = new Asset(assetCode, assetIssuer);

    // Build changeTrust transaction
    const changeTrustOperation = Operation.changeTrust({
      asset: asset,
      limit: "922337203685.4775807", // Maximum limit
    });

    const networkPassphrase =
      networkType === WalletNetwork.PUBLIC ? Networks.PUBLIC : Networks.TESTNET;

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: networkPassphrase,
    })
      .addOperation(changeTrustOperation)
      .setTimeout(180)
      .build();

    // Sign the transaction
    const selectedModule =
      walletName === LOBSTR_ID ? new LobstrModule() : new FreighterModule();
    const kit = new StellarWalletsKit({
      network: networkType,
      selectedWalletId: walletName === LOBSTR_ID ? LOBSTR_ID : FREIGHTER_ID,
      modules: [selectedModule],
    });

    let signedTxXdr: string = "";

    if (walletName === walletTypes.LOBSTR) {
      signedTxXdr = await signTransaction(transaction.toXDR());
    } else {
      const { signedTxXdr: signed } = await kit.signTransaction(
        transaction.toXDR(),
        {
          address: userAddress,
          networkPassphrase: networkType,
        }
      );
      signedTxXdr = signed;
    }

    console.log(`🔐 [TrustlineHelper] Transaction signed, submitting...`);

    // Submit the transaction
    if (!stellarService.server) {
      throw new Error("Horizon server is not initialized");
    }

    const txResponse = await stellarService.server.submitTransaction(
      TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase)
    );

    console.log(
      `✅ [TrustlineHelper] Trustline created successfully for ${assetCode}`,
      {
        transactionHash: txResponse.hash,
      }
    );

    return {
      hasTrustline: true,
      trustlineCreated: true,
      transactionHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error(`❌ [TrustlineHelper] Failed to ensure trustline:`, error);
    return {
      hasTrustline: false,
      trustlineCreated: false,
      error: error.message || "Failed to create trustline",
    };
  }
}
