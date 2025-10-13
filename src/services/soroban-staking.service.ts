import { SorobanService, ContractCallResult } from "./soroban.service";
import {
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { SOROBAN_CONFIG } from "../config/soroban.config";
import axios from "axios";

export interface StakingInfo {
  userAddress: string;
  totalStakedAqua: string;
  totalStakedBlub: string;
  activeStakeCount: number;
  polContribution: string;
  rewardMultiplier: number;
  lastUpdated: number;
}

export interface LockInfo {
  lockId: number;
  amount: string;
  lockTimestamp: number;
  durationDays: number;
  rewardMultiplier: number;
  isActive: boolean;
  polContributed: string;
}

export interface PolInfo {
  totalAqua: string;
  totalBlub: string;
  lpPosition: string;
  rewardsEarned: string;
  iceVotingPower: string;
}

export class SorobanStakingService {
  private sorobanService: SorobanService;
  private backendApi: string;

  constructor() {
    this.sorobanService = new SorobanService();
    this.backendApi = SOROBAN_CONFIG.api.baseUrl;
  }

  /**
   * Stake AQUA tokens with lock duration
   */
  async stakeAqua(
    userAddress: string,
    amount: string,
    durationDays: number,
    signedTxXdr: string
  ): Promise<ContractCallResult> {
    try {
      console.log("🔒 [SorobanStaking] Staking AQUA:", {
        userAddress,
        amount,
        durationDays,
      });

      // Call backend to handle the staking
      const response = await axios.post(`${this.backendApi}/soroban/stake`, {
        userAddress,
        amount,
        durationDays,
        signedTxXdr,
      });

      return {
        success: true,
        data: response.data,
        transactionHash: response.data.transactionHash,
      };
    } catch (error: any) {
      console.error("❌ [SorobanStaking] Stake AQUA failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Unstake AQUA tokens
   */
  async unstakeAqua(
    userAddress: string,
    lockId: number,
    amount: string,
    signedTxXdr: string
  ): Promise<ContractCallResult> {
    try {
      console.log("🔓 [SorobanStaking] Unstaking AQUA:", {
        userAddress,
        lockId,
        amount,
      });

      // Call backend to handle the unstaking
      const response = await axios.post(`${this.backendApi}/soroban/unstake`, {
        userAddress,
        lockId,
        amount,
        signedTxXdr,
      });

      return {
        success: true,
        data: response.data,
        transactionHash: response.data.transactionHash,
      };
    } catch (error: any) {
      console.error("❌ [SorobanStaking] Unstake AQUA failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Restake BLUB tokens
   */
  async restakeBlub(
    userAddress: string,
    amount: string,
    signedTxXdr: string
  ): Promise<ContractCallResult> {
    try {
      console.log("🔄 [SorobanStaking] Restaking BLUB:", {
        userAddress,
        amount,
      });

      // Call backend to handle the restaking
      const response = await axios.post(
        `${this.backendApi}/soroban/restake-blub`,
        {
          userAddress,
          amount,
          signedTxXdr,
        }
      );

      return {
        success: true,
        data: response.data,
        transactionHash: response.data.transactionHash,
      };
    } catch (error: any) {
      console.error("❌ [SorobanStaking] Restake BLUB failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get user's staking information
   */
  async getUserStakingInfo(
    userAddress: string
  ): Promise<ContractCallResult<StakingInfo>> {
    try {
      console.log(
        "📊 [SorobanStaking] Getting user staking info:",
        userAddress
      );

      // Try contract first
      const contractResult =
        await this.sorobanService.simulateContract<StakingInfo>(
          "staking",
          "get_user_staking_info",
          [userAddress]
        );

      if (contractResult.success) {
        return contractResult;
      }

      // Fallback to backend
      const response = await axios.get(
        `${this.backendApi}/soroban/user/${userAddress}/staking-info`
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error("❌ [SorobanStaking] Get staking info failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get user's lock information
   */
  async getUserLocks(
    userAddress: string
  ): Promise<ContractCallResult<LockInfo[]>> {
    try {
      console.log("🔐 [SorobanStaking] Getting user locks:", userAddress);

      // Try contract first
      const contractResult = await this.sorobanService.simulateContract<
        LockInfo[]
      >("staking", "get_user_locks", [userAddress]);

      if (contractResult.success) {
        return contractResult;
      }

      // Fallback to backend
      const response = await axios.get(
        `${this.backendApi}/soroban/user/${userAddress}/locks`
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error("❌ [SorobanStaking] Get user locks failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get Protocol Owned Liquidity information
   */
  async getProtocolOwnedLiquidity(): Promise<ContractCallResult<PolInfo>> {
    try {
      console.log("💧 [SorobanStaking] Getting POL info");

      // Try contract first
      const contractResult =
        await this.sorobanService.simulateContract<PolInfo>(
          "staking",
          "get_protocol_owned_liquidity",
          []
        );

      if (contractResult.success) {
        return contractResult;
      }

      // Fallback to backend
      const response = await axios.get(`${this.backendApi}/soroban/pol-info`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error("❌ [SorobanStaking] Get POL info failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Calculate reward multiplier based on lock duration
   */
  calculateRewardMultiplier(durationDays: number): number {
    const maxDuration = SOROBAN_CONFIG.governance.maxLockDuration;
    const baseMultiplier = SOROBAN_CONFIG.governance.baseMultiplier;
    const maxMultiplier = SOROBAN_CONFIG.governance.maxMultiplier;

    const durationMultiplier = Math.min(durationDays / maxDuration, 1);
    return (
      baseMultiplier + (maxMultiplier - baseMultiplier) * durationMultiplier
    );
  }

  /**
   * Calculate POL contribution (10% of staked AQUA)
   */
  calculatePolContribution(amount: string): string {
    const polPercentage = SOROBAN_CONFIG.pol.contributionPercentage;
    const contribution = parseFloat(amount) * polPercentage;
    return contribution.toFixed(7);
  }

  /**
   * Get total staking statistics
   */
  async getTotalStakingStats(): Promise<ContractCallResult<any>> {
    try {
      console.log("📈 [SorobanStaking] Getting total staking stats");

      const response = await axios.get(
        `${this.backendApi}/soroban/staking-stats`
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error("❌ [SorobanStaking] Get staking stats failed:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Health check for Soroban services
   */
  async healthCheck(): Promise<{ success: boolean; services: any }> {
    try {
      const [contractHealth, backendHealth] = await Promise.all([
        this.sorobanService.healthCheck(),
        axios
          .get(`${this.backendApi}/health`)
          .then((r) => ({ success: true }))
          .catch(() => ({ success: false })),
      ]);

      return {
        success: contractHealth.success && backendHealth.success,
        services: {
          sorobanRpc: contractHealth,
          backend: backendHealth,
        },
      };
    } catch (error: any) {
      console.error("❌ [SorobanStaking] Health check failed:", error);
      return {
        success: false,
        services: {
          sorobanRpc: { success: false },
          backend: { success: false },
        },
      };
    }
  }

  /**
   * Get contract configuration
   */
  getConfig() {
    return SOROBAN_CONFIG;
  }
}

// Export singleton instance
export const sorobanStakingService = new SorobanStakingService();
