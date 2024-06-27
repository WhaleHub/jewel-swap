import { PublicKey } from "@solana/web3.js";

export const isMainnet = true;
export const MIN_DEPOSIT_AMOUNT = 0.01;
export const MAX_FEE_TO_DEPOSIT = 0.014;
export const MINUTE_IN_MS = 60000;
export const DAY_IN_SECOND = 86400;
export const YEAR_IN_DAY = 365;
export const VOTE_COOLDOWN = 10 * 86400;
export const TOKEN_STAKING_EPOCH = 7 * 86400 // 7days;
export const TOKEN_STAKING_COOLDOWN = 7 * 86400 // 7days;
export const UNBOINDING_PERIOD = 5; // 5 Epoch
export const CONTRACT_DEPLOYED_AT = 1708214181;
export const adminWallets = ['2gNjSWyf4WoPjM6QRTRnStaQUHC3yEoo8reW1KgLNViC'];
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');