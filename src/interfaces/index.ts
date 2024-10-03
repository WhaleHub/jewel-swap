import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { DepositType } from "../enums";

export interface IPieChartData {
  title: string;
  value: number;
  color: string;
  voteAccount: PublicKey;
  votingPoint: number;
  lastVotedAt: number;
}

export interface IGlobalState {
  adminAccount: PublicKey;
  botAccount: PublicKey;
  jwlsolMint: PublicKey;
  jwlsolAuthority: PublicKey;
  jwlsolAuthorityBump: number;
  jwlsolVault: PublicKey;
  jwlsolVaultBump: number;
  jwlsolVaultAuthority: PublicKey;
  jwlsolVaultAuthorityBump: number;
  jwlsolReserve: anchor.BN;
  sjwlsolMint: PublicKey;
  sjwlsolAuthority: PublicKey;
  sjwlsolAuthorityBump: number;
  sjwlsolReserve: anchor.BN;
  vejwlsolReserve: anchor.BN;
  reserveVault: PublicKey;
  reserveVaultBump: number;
  stakeWithdrawAuthority: PublicKey;
  stakeWithdrawAuthorityBump: number;
  stakeDepositAuthority: PublicKey;
  stakeDepositAuthorityBump: number;
  splitStakeAccountsStore: PublicKey;
  whirlpool: PublicKey;
  whirlpoolPosition: PublicKey;
  whirlpoolPositionMint: PublicKey;
  whirlpoolPositionMintOwner: PublicKey;
  whirlpoolPositionTokenAccount: PublicKey;
  lastEpochCheckedRewards: anchor.BN;
  totalSolToStake: anchor.BN;
  totalSolToRedeem: anchor.BN;
  totalSolAvailableToUnstake: anchor.BN;
  totalSolToAddLiquidity: anchor.BN;
  totalSolDelegated: anchor.BN;
  totalSolToClaim: anchor.BN;
  totalSolReservedToClaim: anchor.BN;
  totalSolEarned: anchor.BN;
}

export interface IValidator {
  voteAccount: PublicKey;
  validatorStore: PublicKey;
  votingScore: anchor.BN;
  currentScore: anchor.BN;
}

export interface IUserInfoAccount {
  userAddress: PublicKey;
  vejwlsolAmount: anchor.BN;
  votedVejwlsolAmount: anchor.BN;
  reservedRedeemAmount: anchor.BN;
  approvedRedeemAmount: anchor.BN;
  lastRedeemReservedEpoch: anchor.BN;
  lastRedeemApprovedEpoch: anchor.BN;
  isRedeemApproved: boolean;
}

export interface IEpochInfo {
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  absoluteSlot: number;
  blockHeight?: number;
  transactionCount?: number;
}

export interface ITokens {
  tokenSymbol: string;
  tokenMint: PublicKey;
}

export interface ITokenStakingGlobalState {
  adminAccount: PublicKey;
  botAccount: PublicKey;
  tokenAuthority: PublicKey;
  tokenAuthorityBump: number;
  tokenVaultAuthority: PublicKey;
  tokenVaultAuthorityBump: number;
}

export interface IUserJwltokenInfo {
  userAddress: PublicKey;
  jwltokenMint: PublicKey;
  jwltokenStaked: anchor.BN;
  totalRewards: anchor.BN;
  lastStakedAt: anchor.BN;
  lastEpochChecked: anchor.BN;
}

export interface ITokenInfo {
  tokenMint: PublicKey;
  tokenVault: PublicKey;
  tokenVaultBump: number;
  jwltokenMint: PublicKey;
  jwltokenVault: PublicKey;
  jwltokenVaultBump: number;
  stakingPercentage: anchor.BN;
  tokenToStake: anchor.BN;
  tokenToAddLiquidity: anchor.BN;
  totalJwltokenStaked: anchor.BN;
  totalJwltokenCompounded: anchor.BN;
  totalStakers: anchor.BN;
  totalStakersChecked: anchor.BN;
  currentEpoch: anchor.BN;
  epochRewards: anchor.BN;
  epochStartTime: anchor.BN;
}

export interface IToken {
  account: ITokenInfo;
  publicKey: PublicKey;
}

export interface Asset {
  code: string;
  issuer?: string;
}

export interface LpBalance {
  id: string;
  createdAt: string;
  updatedAt: string;
  assetA: Asset;
  assetB: Asset;
  assetAAmount: string;
  assetBAmount: string;
  senderPublicKey: string;
}

export interface SummarizedAssets {
  [key: string]: {
    assetCode: string;
    totalAmount: string;
  };
}

export interface AccountBalance {
  balance: string;
  limit: string;
  buying_liabilities: string;
  selling_liabilities: string;
  sponsor: string;
  last_modified_ledger: number;
  is_authorized: boolean;
  is_authorized_to_maintain_liabilities: boolean;
  asset_type: "credit_alphanum12";
  asset_code: string;
  asset_issuer: string;
}

export interface Pool {
  id: string;
  assetA: Asset;
  assetB: Asset;
  assetAAmount: string;
  assetBAmount: string;
  senderPublicKey: string;
  depositType: DepositType;
}

export interface TransactionData {
  signedTxXdr: string;
  assetA: Asset;
  assetB: Asset;
}

export interface ClaimableRecord {}

export interface Account {
  id: string;
  createdAt: string;
  updatedAt: string;
  account: string;
  claimableRecords: ClaimableRecord[];
  pools: Pool[];
  stakes: Stake[];
  treasuryDeposits: any[];
  lpBalances: LpBalance[];
}

export interface Stake {
  id: string;
  createdAt: string;
  updatedAt: string;
  amount: string;
}

export interface UserRecords {
  balances: AccountBalance[] | null;
  account: Account | null;
}
