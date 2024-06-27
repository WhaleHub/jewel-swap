import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Wallet } from '@coral-xyz/anchor/dist/cjs/provider';
import liquidStakingIdl from '../idls/liquid_staking-idl.json';
import tokenStakingIdl from '../idls/token_staking-idl.json';
import { JewelswapLiquidStaking } from '../types/jewelswap_liquid_staking';
import { JewelswapTokenStaking } from '../types/jewelswap_token_staking';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { DAY_IN_SECOND, TOKEN_STAKING_EPOCH, YEAR_IN_DAY } from '../config';
import { tokenAddresses, wlValidators } from '../data';

export const connection = new Connection(process.env.REACT_APP_RPC_URL || clusterApiUrl('devnet'), "confirmed");
export const programId = new PublicKey(liquidStakingIdl.metadata.address);
export const tokenStakingProgramId = new PublicKey(tokenStakingIdl.metadata.address);

export const globalStatePubkey = PublicKey.findProgramAddressSync(
    [Buffer.from('global-state')],
    programId
)[0];

export const reserveVault = PublicKey.findProgramAddressSync(
    [
        Buffer.from('reserve-vault'),
        globalStatePubkey.toBuffer(),
    ],
    programId
)[0];

export const useContractInteractor = () => {
    const wallet = useWallet();
    const provider = new AnchorProvider(connection, wallet as Wallet, { commitment: 'confirmed' });
    const program = new Program(liquidStakingIdl as anchor.Idl, programId, provider) as unknown as Program<JewelswapLiquidStaking>;

    const tokenStakingProvider = new AnchorProvider(connection, wallet as Wallet, { commitment: 'confirmed' });
    const tokenStakingProgram = new Program(tokenStakingIdl as anchor.Idl, tokenStakingProgramId, tokenStakingProvider) as unknown as Program<JewelswapTokenStaking>;

    return { provider, program, tokenStakingProgram };
};

export const getBlockTime = async () => {
    const slot = await connection.getSlot();
    const currentBlockTime = await connection.getBlockTime(slot);

    return currentBlockTime || 0;
}

export const getBalance = async (address: PublicKey): Promise<number> => {
    return await connection.getBalance(address);
}

export const getTokenBalance = async (
    address: PublicKey,
    tokenMint: PublicKey
): Promise<number> => {
    const tokenAccount = await getAssociatedTokenAddress(tokenMint, address);
    const tokenAccountInfo = await connection.getAccountInfo(tokenAccount);
    if (tokenAccountInfo) {
        const tokenBalance = await connection.getTokenAccountBalance(tokenAccount);
        return Number(tokenBalance.value.amount);
    } else {
        return 0;
    }
}

export const getTokenSupply = async (
    tokenMint: PublicKey
): Promise<number> => {
    try {
        const tokenSupply = await connection.getTokenSupply(tokenMint);
        return Number(tokenSupply.value.amount);
    } catch {
        return 0;
    }
}

export const getApy = async (
    jwlsolReserve: number,
    sjwlsolReserve: number,
    contractDeployedAt: number,
): Promise<number> => {
    let apy = 0;

    if (sjwlsolReserve > 0 && jwlsolReserve > sjwlsolReserve) {
        const currentBlockTime = await getBlockTime();
        const increasedAmount = jwlsolReserve - sjwlsolReserve;
        const elapsedTime = currentBlockTime - contractDeployedAt;
        apy = increasedAmount / sjwlsolReserve / (elapsedTime / DAY_IN_SECOND) * YEAR_IN_DAY * 100;
    }

    return apy;
}

export const getTokenStakingApy = async (
    epochRewards: number,
    totalStakedAmount: number,
    epochStartTime: number,
    currentBlockTime: number,
): Promise<number> => {
    let apy = 0;

    if (totalStakedAmount > 0) {
        const elapsedTime = currentBlockTime - epochStartTime;
        const apr = epochRewards * YEAR_IN_DAY * DAY_IN_SECOND / elapsedTime / totalStakedAmount;
        const compoundPeriod = TOKEN_STAKING_EPOCH;
        apy = ((1 + apr / compoundPeriod) ** compoundPeriod - 1) * 100;
    }

    return apy;
}

export const getValidatorName = (voteAccount: string): string | undefined => {
    const validator = wlValidators.find(x => x.voteAccount == voteAccount);
    return validator?.name
}

export const sliderValueLabelFormat = (value: number) => {
    return `${value} %`;
};

export const convertSecondsToDateTime = (secondsToConvert: number) => {
    if (secondsToConvert > 0) {
        const days = Math.floor(secondsToConvert / (3600 * 24));
        secondsToConvert %= 3600 * 24;
        const hours = Math.floor(secondsToConvert / 3600);
        secondsToConvert %= 3600;
        const minutes = Math.floor(secondsToConvert / 60);
        const seconds = Math.floor(secondsToConvert % 60);

        return `${days.toFixed()}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    } else {
        return '0d 0h 0m 0s';
    }
};

export const getTokenSymbolFromTokenMint = (tokenMint: PublicKey): string | undefined => {
    const keys = Object.keys(tokenAddresses);
    const values = Object.values(tokenAddresses);
    const searchIndex = values.findIndex(x => x.toString() == tokenMint.toString());
    return searchIndex !== -1 ? keys[searchIndex].toUpperCase() : 'unknown';
}