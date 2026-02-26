import axios, { AxiosInstance, AxiosResponse } from "axios";

// API Response wrapper
interface ApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  message?: string;
}

// Staking interfaces
export interface StakingRequest {
  userAddress: string;
  amount: string;
  durationDays?: number;
  txHash: string;
}

export interface UnstakingRequest {
  userAddress: string;
  lockId: number;
  amount: string;
  txHash: string;
}

// Governance interfaces
export interface IceIssuanceRequest {
  userAddress: string;
  aquaAmount: string;
  lockDurationDays: number;
  txHash: string;
}

export interface GovernanceRecord {
  user: string;
  aquaLocked: string;
  iceAmount: string;
  votingPower: string;
  lockTimestamp: number;
  lockDuration: number;
}

// Rewards interfaces
export interface RewardPoolFundingRequest {
  poolId: string;
  assetCode: string;
  amount: string;
  distributionDays: number;
  txHash: string;
}

export interface UserRewardInfo {
  user: string;
  poolId: string;
  claimableRewards: string;
  totalClaimed: string;
  lastClaimTimestamp: number;
  rewardShare: string;
}

// Liquidity interfaces
export interface LiquidityRequest {
  userAddress: string;
  poolId: string;
  assetAAmount: string;
  assetBAmount: string;
  lpTokens: string;
  txHash: string;
}

export interface LiquidityPool {
  poolId: string;
  assetA: string;
  assetB: string;
  reserveA: string;
  reserveB: string;
  totalShares: string;
  feeRate: number;
  isActive: boolean;
}

// Transaction interfaces
export interface TransactionSummary {
  transactionHash: string;
  contractType: string;
  method: string;
  success: boolean;
  userAddress: string;
  gasUsed: number;
  feeCharged: number;
  timestamp: Date;
}

export class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Get required backend URL from environment
    const backendUrl = process.env.REACT_APP_BACKEND_API_URL;
    if (!backendUrl) {
      throw new Error(
        "❌ [ApiService] Missing required environment variable: REACT_APP_BACKEND_API_URL. Please set it in your .env file."
      );
    }
    this.baseURL = backendUrl;

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
    console.log("🔗 [ApiService] Initialized with base URL:", this.baseURL);
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(
          `🚀 [ApiService] ${config.method?.toUpperCase()} ${config.url}`
        );
        return config;
      },
      (error) => {
        console.error("❌ [ApiService] Request error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        console.log(`✅ [ApiService] Response:`, response.data);
        return response;
      },
      (error) => {
        console.error("❌ [ApiService] Response error:", error);

        // Handle specific error cases
        if (error.response?.status === 404) {
          throw new Error("API endpoint not found");
        } else if (error.response?.status >= 500) {
          throw new Error("Server error occurred");
        } else if (error.code === "ECONNABORTED") {
          throw new Error("Request timeout");
        }

        throw error;
      }
    );
  }

  // =================
  // HEALTH & STATUS
  // =================

  async healthCheck(): Promise<any> {
    const response = await this.api.get<ApiResponse>("/api/soroban/health");
    return response.data.data;
  }

  async getSyncStatus(contractType?: string): Promise<any> {
    const params = contractType ? { contractType } : {};
    const response = await this.api.get<ApiResponse>(
      "/api/soroban/sync/status",
      { params }
    );
    return response.data.data;
  }

  async getSyncHealth(): Promise<any> {
    const response = await this.api.get<ApiResponse>(
      "/api/soroban/sync/health"
    );
    return response.data.data;
  }

  // =================
  // STAKING ENDPOINTS
  // =================

  async recordAquaLock(request: StakingRequest): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      "/api/soroban/staking/lock",
      request
    );
    return response.data.data;
  }

  async recordAquaUnlock(request: UnstakingRequest): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      "/api/soroban/staking/unlock",
      request
    );
    return response.data.data;
  }

  async recordBlubRestake(
    request: Omit<StakingRequest, "durationDays">
  ): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      "/api/soroban/staking/blub-restake",
      request
    );
    return response.data.data;
  }

  async getUserLocks(userAddress: string): Promise<any> {
    const response = await this.api.get<ApiResponse>(
      `/api/soroban/staking/locks/${userAddress}`
    );
    return response.data.data;
  }

  async getProtocolOwnedLiquidity(): Promise<any> {
    const response = await this.api.get<ApiResponse>(
      "/api/soroban/staking/pol"
    );
    return response.data.data;
  }

  async getStakingStats(userAddress?: string): Promise<any> {
    const params = userAddress ? { userAddress } : {};
    const response = await this.api.get<ApiResponse>(
      "/api/soroban/staking/stats",
      { params }
    );
    return response.data.data;
  }

  // ===================
  // GOVERNANCE ENDPOINTS
  // ===================

  async recordIceIssuance(request: IceIssuanceRequest): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      "/api/soroban/governance/ice-issuance",
      request
    );
    return response.data.data;
  }

  async getUserGovernance(userAddress: string): Promise<GovernanceRecord> {
    const response = await this.api.get<ApiResponse<GovernanceRecord>>(
      `/api/soroban/governance/user/${userAddress}`
    );
    return response.data.data!;
  }

  async getGovernanceStats(): Promise<any> {
    const response = await this.api.get<ApiResponse>(
      "/api/soroban/governance/stats"
    );
    return response.data.data;
  }

  // ================
  // REWARDS ENDPOINTS
  // ================

  async fundRewardPool(request: RewardPoolFundingRequest): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      "/api/soroban/rewards/fund-pool",
      request
    );
    return response.data.data;
  }

  async estimateUserRewards(
    userAddress: string,
    poolId: string
  ): Promise<string> {
    const response = await this.api.get<ApiResponse<string>>(
      `/api/soroban/rewards/estimate/${userAddress}/${poolId}`
    );
    return response.data.data!;
  }

  async claimRewards(request: {
    userAddress: string;
    poolId: string;
    amount: string;
    txHash: string;
  }): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      "/api/soroban/rewards/claim",
      request
    );
    return response.data.data;
  }

  async getUserRewards(
    userAddress: string,
    poolId?: string
  ): Promise<UserRewardInfo | UserRewardInfo[]> {
    const params = poolId ? { poolId } : {};
    const response = await this.api.get<
      ApiResponse<UserRewardInfo | UserRewardInfo[]>
    >(`/api/soroban/rewards/user/${userAddress}`, { params });
    return response.data.data!;
  }

  async getRewardPool(poolId: string): Promise<any> {
    const response = await this.api.get<ApiResponse>(
      `/api/soroban/rewards/pool/${poolId}`
    );
    return response.data.data;
  }

  async getRewardStats(): Promise<any> {
    const response = await this.api.get<ApiResponse>(
      "/api/soroban/rewards/stats"
    );
    return response.data.data;
  }

  async recordAquaRewardConversion(request: {
    aquaAmount: string;
    blubRewardAmount: string;
    txHash: string;
  }): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      "/api/soroban/rewards/aqua-conversion",
      request
    );
    return response.data.data;
  }

  // ===================
  // LIQUIDITY ENDPOINTS
  // ===================

  async registerPool(request: {
    poolId: string;
    assetA: any;
    assetB: any;
    initialReserveA: string;
    initialReserveB: string;
    feeRate: number;
    txHash: string;
  }): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      "/api/soroban/liquidity/register-pool",
      request
    );
    return response.data.data;
  }

  async recordLiquidityAddition(request: LiquidityRequest): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      "/api/soroban/liquidity/add",
      request
    );
    return response.data.data;
  }

  async recordLiquidityRemoval(request: {
    userAddress: string;
    poolId: string;
    lpTokensToRemove: string;
    assetAReturned: string;
    assetBReturned: string;
    txHash: string;
  }): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      "/api/soroban/liquidity/remove",
      request
    );
    return response.data.data;
  }

  async getPool(poolId: string): Promise<LiquidityPool> {
    const response = await this.api.get<ApiResponse<LiquidityPool>>(
      `/api/soroban/liquidity/pool/${poolId}`
    );
    return response.data.data!;
  }

  async getUserLpPosition(userAddress: string, poolId: string): Promise<any> {
    const response = await this.api.get<ApiResponse>(
      `/api/soroban/liquidity/user/${userAddress}/position/${poolId}`
    );
    return response.data.data;
  }

  async getUserLpPositions(userAddress: string): Promise<string[]> {
    const response = await this.api.get<ApiResponse<string[]>>(
      `/api/soroban/liquidity/user/${userAddress}/positions`
    );
    return response.data.data!;
  }

  async getLiquidityStats(): Promise<any> {
    const response = await this.api.get<ApiResponse>(
      "/api/soroban/liquidity/stats"
    );
    return response.data.data;
  }

  // =====================
  // TRANSACTION ENDPOINTS
  // =====================

  async getTransactionStats(
    startDate?: string,
    endDate?: string,
    contractType?: string
  ): Promise<any> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (contractType) params.contractType = contractType;

    const response = await this.api.get<ApiResponse>(
      "/api/soroban/transactions/stats",
      { params }
    );
    return response.data.data;
  }

  async getRecentTransactions(
    limit?: number,
    contractType?: string,
    userAddress?: string
  ): Promise<TransactionSummary[]> {
    const params: any = {};
    if (limit) params.limit = limit;
    if (contractType) params.contractType = contractType;
    if (userAddress) params.userAddress = userAddress;

    const response = await this.api.get<ApiResponse<TransactionSummary[]>>(
      "/api/soroban/transactions/recent",
      { params }
    );
    return response.data.data!;
  }

  async getTransaction(hash: string): Promise<any> {
    const response = await this.api.get<ApiResponse>(
      `/api/soroban/transactions/${hash}`
    );
    return response.data.data;
  }

  async getUserTransactionHistory(
    userAddress: string,
    page?: number,
    limit?: number
  ): Promise<{
    transactions: TransactionSummary[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params: any = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;

    const response = await this.api.get<
      ApiResponse<{
        transactions: TransactionSummary[];
        total: number;
        page: number;
        totalPages: number;
      }>
    >(`/api/soroban/transactions/user/${userAddress}`, { params });
    return response.data.data!;
  }

  // ===================
  // MIGRATION ENDPOINTS
  // ===================

  async migrateUser(userAddress: string, migrationType?: string): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      `/api/soroban/migration/user/${userAddress}`,
      {
        migrationType,
      }
    );
    return response.data.data;
  }

  async getMigrationPlan(
    userAddress: string,
    migrationType?: string
  ): Promise<any> {
    const params = migrationType ? { type: migrationType } : {};
    const response = await this.api.get<ApiResponse>(
      `/api/soroban/migration/plan/${userAddress}`,
      { params }
    );
    return response.data.data;
  }

  async getMigrationStatus(userAddress?: string): Promise<any> {
    const params = userAddress ? { userAddress } : {};
    const response = await this.api.get<ApiResponse>(
      "/api/soroban/migration/status",
      { params }
    );
    return response.data.data;
  }

  async validateUserData(userAddress: string): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      `/api/soroban/migration/validate/${userAddress}`
    );
    return response.data.data;
  }

  // ===============
  // ADMIN ENDPOINTS
  // ===============

  async forceSync(): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      "/api/soroban/admin/sync/force"
    );
    return response.data.data;
  }

  async syncContract(contractType: string): Promise<any> {
    const response = await this.api.post<ApiResponse>(
      `/api/soroban/admin/sync/contract/${contractType}`
    );
    return response.data.data;
  }

  async getContractPerformance(): Promise<any> {
    const response = await this.api.get<ApiResponse>(
      "/api/soroban/admin/analytics/performance"
    );
    return response.data.data;
  }

  async getErrorAnalysis(contractType?: string): Promise<any> {
    const params = contractType ? { contractType } : {};
    const response = await this.api.get<ApiResponse>(
      "/api/soroban/admin/analytics/errors",
      { params }
    );
    return response.data.data;
  }

  // ===============
  // UTILITY METHODS
  // ===============

  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error("❌ [ApiService] Connection test failed:", error);
      return false;
    }
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

// Export singleton instance
export const apiService = new ApiService();
