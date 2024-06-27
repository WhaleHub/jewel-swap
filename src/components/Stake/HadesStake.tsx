import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { TailSpin } from 'react-loader-spinner';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    InputAdornment,
    InputBase,
    LinearProgress,
} from '@mui/material';
import {
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material';
import * as anchor from '@coral-xyz/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { convertSecondsToDateTime, getBlockTime, getTokenBalance, getTokenStakingApy, getTokenSupply, useContractInteractor } from '../../utils';
import { tokenAddresses } from '../../data';
import { ITokenInfo, ITokenStakingGlobalState, IUserJwltokenInfo } from '../../interfaces';
import { MINUTE_IN_MS, TOKEN_STAKING_COOLDOWN, TOKEN_STAKING_EPOCH } from '../../config';
import hadesLogo from '../../assets/images/hades.png';

const HadesStake = () => {
    const wallet = useWallet();
    const { tokenStakingProgram: program } = useContractInteractor();
    const [tokenInfo, setTokenInfo] = useState<ITokenInfo>();
    const [globalStateInfo, setGlobalStateInfo] = useState<ITokenStakingGlobalState>();
    const [userJwltokenInfo, setUserJwltokenInfo] = useState<IUserJwltokenInfo>();
    const [releaseTime, setReleaseTime] = useState<number>(0);
    const [hadesBalance, setHadesBalance] = useState<number>(0);
    const [jwlhadesBalance, setJwlhadesBalance] = useState<number>(0);
    const [stakedAmount, setStakedAmount] = useState<number>(0);
    const [jwlhadesSupply, setJwlhadesSupply] = useState<number>(0);
    const [apy, setApy] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [amountToConvert, setAmountToConvert] = useState<number | null>();
    const [amountToStake, setAmountToStake] = useState<number | null>();
    const [amountToUnstake, setAmountToUnstake] = useState<number | null>();
    const [isStakingAfertConvert, setIsStakingAfertConvert] = useState<boolean>(false);
    const [isTokenStakeExpanded, setIsTokenStakedExpanded] = useState<boolean>(false);
    const [isConverting, setIsConverting] = useState<boolean>(false);
    const [isStaking, setIsStaking] = useState<boolean>(false);
    const [isUnstaking, setIsUnstaking] = useState<boolean>(false);
    const [isClaiming, setIsClaiming] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const globalStatePubkey = PublicKey.findProgramAddressSync(
        [Buffer.from('global-state')],
        program.programId
    )[0];

    const initialize = async (isInit?: boolean) => {
        if (isInit) {
            setIsLoading(true);
        }

        try {
            const tokenMint = tokenAddresses.hades;
            const globalStatePubkey = PublicKey.findProgramAddressSync(
                [Buffer.from('global-state')],
                program.programId
            )[0];

            const tokenInfoPubkey = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-info'),
                    tokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const [globalStateInfo, tokenInfo, currentTime] = await Promise.all([
                program.account.globalState.fetch(globalStatePubkey),
                program.account.tokenInfo.fetch(tokenInfoPubkey),
                getBlockTime(),
            ]);

            const apy = await getTokenStakingApy(
                tokenInfo.epochRewards.toNumber(),
                tokenInfo.totalJwltokenStaked.toNumber(),
                tokenInfo.epochStartTime.toNumber(),
                currentTime,
            );

            let hadesBalance = 0;
            let jwlhadesBalance = 0;
            let jwlhadesSupply = 0;
            let userJwlTokenInfo;

            if (wallet?.publicKey) {
                try {
                    const userJwltokenInfoPubkey = PublicKey.findProgramAddressSync(
                        [
                            Buffer.from('user-jwltoken-info'),
                            wallet.publicKey.toBuffer(),
                            tokenInfo.jwltokenMint.toBuffer(),
                        ],
                        program.programId
                    )[0];

                    userJwlTokenInfo = await program.account.userJwltokenInfo.fetch(userJwltokenInfoPubkey);
                    setStakedAmount(userJwlTokenInfo ? userJwlTokenInfo.jwltokenStaked.toNumber() : 0);
                } catch { }

                [hadesBalance, jwlhadesBalance, jwlhadesSupply] = await Promise.all([
                    getTokenBalance(wallet.publicKey, tokenMint),
                    getTokenBalance(wallet.publicKey, tokenInfo.jwltokenMint),
                    getTokenSupply(tokenInfo.jwltokenMint),
                ]);

                if (userJwlTokenInfo) {
                    if (userJwlTokenInfo.lastStakedAt.toNumber() > 0) {
                        const releaseTime = userJwlTokenInfo.lastStakedAt.toNumber() + TOKEN_STAKING_COOLDOWN;
                        if (releaseTime > currentTime) {
                            setReleaseTime(releaseTime);
                        }
                    }
                }

                setUserJwltokenInfo(userJwlTokenInfo);
            } else {
                [jwlhadesSupply] = await Promise.all([
                    getTokenSupply(tokenInfo.jwltokenMint),
                ]);
            }

            console.log({ globalStateInfo });
            console.log({ tokenInfo });

            setGlobalStateInfo(globalStateInfo);
            setTokenInfo(tokenInfo);
            setCurrentTime(currentTime);
            setHadesBalance(hadesBalance);
            setJwlhadesBalance(jwlhadesBalance);
            setJwlhadesSupply(jwlhadesSupply);
            setApy(apy);
        } catch (e) {
            console.log('e', e);
        }

        setIsLoading(false);
    }

    const handleConvert = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet.');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized.');
        }

        if (!tokenInfo) {
            return toast.warn('Token info not initialized.');
        }

        if (!amountToConvert) {
            return toast.warn('Please input amount to convert.');
        }

        if (hadesBalance < amountToConvert * LAMPORTS_PER_SOL) {
            return toast.warn('Insufficient balance.');
        }

        setIsProcessing(true);
        setIsConverting(true);

        try {
            const tokenMint = tokenAddresses.hades;
            const tokenInfoPubkey = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-info'),
                    tokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const tokenVault = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-vault'),
                    tokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const jwltokenVault = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-vault'),
                    tokenInfo.jwltokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const userJwltokenInfo = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('user-jwltoken-info'),
                    wallet.publicKey.toBuffer(),
                    tokenInfo.jwltokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const userTokenAccount = await getAssociatedTokenAddress(tokenMint, wallet.publicKey);
            const userJwltokenAccount = await getAssociatedTokenAddress(tokenInfo.jwltokenMint, wallet.publicKey);

            const amount = amountToConvert * LAMPORTS_PER_SOL;

            const txh = await program.methods
                .convert(
                    new anchor.BN(amount),
                    isStakingAfertConvert
                )
                .accounts({
                    signer: wallet.publicKey,
                    globalState: globalStatePubkey,
                    tokenMint: tokenMint,
                    tokenInfo: tokenInfoPubkey,
                    tokenVault: tokenVault,
                    tokenAuthority: globalStateInfo.tokenAuthority,
                    jwltokenMint: tokenInfo.jwltokenMint,
                    jwltokenVault: jwltokenVault,
                    userTokenAccount: userTokenAccount,
                    userJwltokenAccount: userJwltokenAccount,
                    userJwltokenInfo: userJwltokenInfo,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                })
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to convert token');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to convert token');
        }

        setIsProcessing(false);
        setIsConverting(false);
    }

    const handleStake = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet.');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized.');
        }

        if (!tokenInfo) {
            return toast.warn('Token info not initialized.');
        }

        if (!amountToStake) {
            return toast.warn('Please input amount to stake.');
        }

        if (jwlhadesBalance < amountToStake * LAMPORTS_PER_SOL) {
            return toast.warn('Insufficient balance.');
        }

        setIsProcessing(true);
        setIsStaking(true);

        try {
            const tokenMint = tokenAddresses.hades;
            const tokenInfoPubkey = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-info'),
                    tokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const jwltokenVault = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-vault'),
                    tokenInfo.jwltokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const userJwltokenInfo = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('user-jwltoken-info'),
                    wallet.publicKey.toBuffer(),
                    tokenInfo.jwltokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const userJwltokenAccount = await getAssociatedTokenAddress(tokenInfo.jwltokenMint, wallet.publicKey);

            const amount = amountToStake * LAMPORTS_PER_SOL;

            const txh = await program.methods
                .stakeJwltoken(
                    new anchor.BN(amount)
                )
                .accounts({
                    signer: wallet.publicKey,
                    globalState: globalStatePubkey,
                    tokenMint: tokenMint,
                    tokenInfo: tokenInfoPubkey,
                    jwltokenMint: tokenInfo.jwltokenMint,
                    jwltokenVault: jwltokenVault,
                    userJwltokenAccount: userJwltokenAccount,
                    userJwltokenInfo: userJwltokenInfo,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to stake JWLHADES');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to stake JWLHADES');
        }

        setIsProcessing(false);
        setIsStaking(false);
    }

    const handleUnstake = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet.');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized.');
        }

        if (!userJwltokenInfo) {
            return toast.warn('Zero staked amount.');
        }

        if (!tokenInfo) {
            return toast.warn('Token info not initialized.');
        }

        if (!amountToUnstake) {
            return toast.warn('Please input amount to unstake.');
        }

        if (stakedAmount < amountToUnstake * LAMPORTS_PER_SOL) {
            return toast.warn('Insufficient balance.');
        }

        setIsProcessing(true);
        setIsUnstaking(true);

        try {
            const currentBlockTime = await getBlockTime();
            if (userJwltokenInfo.lastStakedAt.toNumber() + TOKEN_STAKING_COOLDOWN >= currentBlockTime) {
                setIsProcessing(false);
                setIsUnstaking(false);
                return toast.warn('Cooldown is not over.');
            }

            const tokenMint = tokenAddresses.hades;
            const tokenInfoPubkey = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-info'),
                    tokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const jwltokenVault = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-vault'),
                    tokenInfo.jwltokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const userJwltokenInfoPubkey = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('user-jwltoken-info'),
                    wallet.publicKey.toBuffer(),
                    tokenInfo.jwltokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const userJwltokenAccount = await getAssociatedTokenAddress(tokenInfo.jwltokenMint, wallet.publicKey);

            const amount = amountToUnstake * LAMPORTS_PER_SOL;

            const txh = await program.methods
                .unstakeJwltoken(
                    new anchor.BN(amount)
                )
                .accounts({
                    signer: wallet.publicKey,
                    globalState: globalStatePubkey,
                    tokenMint: tokenMint,
                    tokenInfo: tokenInfoPubkey,
                    tokenVaultAuthority: globalStateInfo.tokenVaultAuthority,
                    jwltokenMint: tokenInfo.jwltokenMint,
                    jwltokenVault: jwltokenVault,
                    userJwltokenAccount: userJwltokenAccount,
                    userJwltokenInfo: userJwltokenInfoPubkey,
                })
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to unstake JWLHADES');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to unstake JWLHADES');
        }

        setIsProcessing(false);
        setIsUnstaking(false);
    }

    const handleClaim = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet.');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized.');
        }

        if (!tokenInfo) {
            return toast.warn('Token info not initialized.');
        }

        if (!userJwltokenInfo || userJwltokenInfo.totalRewards.toNumber() == 0) {
            return toast.warn('No rewards.');
        }

        setIsProcessing(true);
        setIsClaiming(true);

        try {
            const tokenMint = tokenAddresses.hades;
            const tokenInfoPubkey = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-info'),
                    tokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const jwltokenVault = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-vault'),
                    tokenInfo.jwltokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const userJwltokenInfoPubkey = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('user-jwltoken-info'),
                    wallet.publicKey.toBuffer(),
                    tokenInfo.jwltokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const userJwltokenAccount = await getAssociatedTokenAddress(tokenInfo.jwltokenMint, wallet.publicKey);

            const amount = userJwltokenInfo ? userJwltokenInfo.totalRewards : new anchor.BN(0);

            const txh = await program.methods
                .claimRewards(amount)
                .accounts({
                    signer: wallet.publicKey,
                    globalState: globalStatePubkey,
                    tokenMint: tokenMint,
                    tokenVaultAuthority: globalStateInfo.tokenVaultAuthority,
                    tokenInfo: tokenInfoPubkey,
                    jwltokenVault: jwltokenVault,
                    userJwltokenAccount: userJwltokenAccount,
                    jwltokenMint: tokenInfo.jwltokenMint,
                    userJwltokenInfo: userJwltokenInfoPubkey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to claim rewards');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to claim rewards');
        }

        setIsProcessing(false);
        setIsClaiming(false);
    }

    useEffect(() => {
        const getEpochInfo = async () => {
            const tokenMint = tokenAddresses.hades;
            const tokenInfoPubkey = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-info'),
                    tokenMint.toBuffer(),
                ],
                program.programId
            )[0];

            const [tokenInfo, currentTime] = await Promise.all([
                program.account.tokenInfo.fetch(tokenInfoPubkey),
                getBlockTime(),
            ]);

            setTokenInfo(tokenInfo);
            setCurrentTime(currentTime);
        }

        const interval = setInterval(() => {
            getEpochInfo();
        }, MINUTE_IN_MS);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        (async () => {
            await initialize(true);
        })();
    }, [wallet?.publicKey]);

    return (
        <>
            <div className='flex flex-col gap-[7px] w-full'>
                <div className='text-[14px]'>Convert HADES to JWLHADES. By staking JWLHADES, you're earning a share of the future staked HADES yield.</div>
                <div className='text-[14px]'>You may stake and unstake JWLHADES tokens, but not convert them back to HADES at JewelSwap. A dynamic % will also be sent for LP creation. You will be able to swap HADES-JWLHADES at ORCA.</div>
            </div>

            <div className='flex flex-col items-center mt-[21px]'>
                <div className='text-[21px] text-[#54f5b7] leading-[1.2]'>{`Epoch ${tokenInfo ? tokenInfo.currentEpoch.toNumber() : '-'}`}</div>
                <div className='mt-[21px] font-light'>{`${tokenInfo ? convertSecondsToDateTime(tokenInfo.epochStartTime.toNumber() + TOKEN_STAKING_EPOCH - currentTime) : 0} left until next rewards distribution`}</div>
                <div className='w-full h-[14px] mt-[14px]'>
                    <LinearProgress
                        value={tokenInfo ? (currentTime - tokenInfo.epochStartTime.toNumber()) / TOKEN_STAKING_EPOCH * 100 : 0}
                        variant='determinate'
                        sx={{
                            height: '14px',
                            width: '100%',
                            borderRadius: '5px',
                            '&.MuiLinearProgress-root': {
                                backgroundColor: 'white',

                                '.MuiLinearProgress-bar': {
                                    backgroundColor: '#198754',
                                    backgroundImage: 'linear-gradient(45deg,hsla(0,0%,100%,.15) 25%,transparent 0,transparent 50%,hsla(0,0%,100%,.15) 0,hsla(0,0%,100%,.15) 75%,transparent 0,transparent)',
                                    backgroundSize: '14px 14px'
                                }
                            }
                        }}
                    />
                </div>
                <div className='mt-[14px]'><span className='mr-[14px]'>Epoch Rewards:</span> {`${tokenInfo ? (tokenInfo.epochRewards.toNumber() / LAMPORTS_PER_SOL).toLocaleString() : 0} JWLHADES`}</div>
            </div>

            <div className='flex flex-col gap-[21px] w-full mt-[14px]'>
                {/* Token staking */}
                <div className='w-full bg-[rgb(18,18,18)] bg-[linear-gradient(rgba(255,255,255,0.05),rgba(255,255,255,0.05))] rounded-[4px]'>
                    <Accordion
                        expanded={isTokenStakeExpanded}
                    >
                        <AccordionSummary
                            id='panel1a-header'
                            aria-controls='panel1a-content'
                            className='w-full !cursor-default'
                        >
                            <div className='grid grid-cols-12 w-full text-[12.6px] px-[10.5px]'>
                                <div className='col-span-12 md:col-span-3 flex items-center md:px-[10.5px]'>
                                    <div className='flex items-center'>
                                        <div className='flex justify-center items-center w-[50px] h-[50px] mx-[7px]'>
                                            <img src={hadesLogo} alt='jwlsol-logo' className='w-full rounded-full' />
                                        </div>
                                        <div className='flex flex-col justify-center'>
                                            <div>HADES</div>
                                        </div>
                                    </div>
                                </div>

                                <div className='col-span-12 md:col-span-2 flex flex-col justify-center md:px-[10.5px]'>
                                    <div>TVL</div>
                                    <div>{`${(jwlhadesSupply / LAMPORTS_PER_SOL).toLocaleString()} JWLHADES`}</div>
                                </div>

                                <div className='col-span-12 md:col-span-1 flex flex-col justify-center md:px-[10.5px]'>
                                    <div>APY</div>
                                    <div className='text-[#54f5b7]'>{`${apy.toLocaleString()} %`}</div>
                                </div>

                                <div className='col-span-12 md:col-span-3 flex items-center md:px-[10.5px]'>
                                    <div className='flex flex-col w-full'>
                                        <div className='flex justify-between items-center w-full'>
                                            <div>Your balance</div>
                                            <div className='text-end'>
                                                <div>{`${(hadesBalance / LAMPORTS_PER_SOL).toLocaleString()} HADES`}</div>
                                                <div>{`${(jwlhadesBalance / LAMPORTS_PER_SOL).toLocaleString()} JWLHADES`}</div>
                                            </div>
                                        </div>

                                        <div className='flex justify-between items-center w-full'>
                                            <div>Staked balance</div>
                                            <div className='text-end'>
                                                <div>{`${(stakedAmount / LAMPORTS_PER_SOL).toLocaleString()} JWLHADES`}</div>
                                            </div>
                                        </div>

                                        <div className='flex justify-between items-center w-full'>
                                            <div>Expected Rewards</div>
                                            <div className='text-end'>
                                                <div>{`${(tokenInfo && tokenInfo.totalJwltokenStaked.toNumber() > 0) ? (tokenInfo.epochRewards.toNumber() * stakedAmount / tokenInfo.totalJwltokenStaked.toNumber()).toLocaleString() : 0} JWLHADES`}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className='col-span-12 md:col-span-1 md:px-[10.5px]'></div>

                                <div className='col-span-12 md:col-span-2 flex items-center md:px-[10.5px]'>
                                    <button
                                        className='flex justify-center items-center w-full p-[7px] border border-solid border-[rgba(84,245,183,0.6)] rounded-[5px]'
                                        onClick={() => setIsTokenStakedExpanded(!isTokenStakeExpanded)}
                                    >
                                        <span>Stake / Unstake</span>
                                        {
                                            isTokenStakeExpanded ? (
                                                <KeyboardArrowUpIcon className='text-white' />
                                            ) : (
                                                <KeyboardArrowDownIcon className='text-white' />
                                            )
                                        }
                                    </button>
                                </div>
                            </div>
                        </AccordionSummary>

                        <AccordionDetails
                            sx={{ padding: '0px 16px 16px' }}
                        >
                            <div className='grid grid-cols-12 gap-[20px] md:gap-0 w-full mt-[14px]'>
                                <div className='col-span-12 md:col-span-6'>
                                    <div className='grid grid-cols-12 gap-[20px] md:gap-0 w-full'>
                                        <div className='col-span-12 md:col-span-6 flex flex-col px-[10.5px]'>
                                            <div className='flex items-center md:items-start h-[33px] leading-[15px]'>{`Avail HADES Balance: ${(hadesBalance / LAMPORTS_PER_SOL).toLocaleString()} HADES`}</div>

                                            <InputBase
                                                sx={{
                                                    flex: 1,
                                                    border: '1px',
                                                    borderStyle: 'solid',
                                                    borderRadius: '5px',
                                                    borderColor: 'gray',
                                                    padding: '2px 5px',
                                                }}
                                                endAdornment={
                                                    <InputAdornment
                                                        position="end"
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => setAmountToConvert(hadesBalance / LAMPORTS_PER_SOL)}
                                                    >
                                                        Max
                                                    </InputAdornment>
                                                }
                                                type='number'
                                                placeholder='0.00'
                                                disabled={isProcessing || isConverting}
                                                value={amountToConvert != null ? amountToConvert : ''}
                                                className='mt-[3.5px]'
                                                onChange={e => setAmountToConvert(e.target.value ? Number(e.target.value) : null)}
                                            />

                                            <div className='hidden md:flex items-center h-[28px] leading-[15px] mt-[7px]'></div>

                                            <button
                                                disabled={isProcessing || isConverting}
                                                className='flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2'
                                                onClick={handleConvert}
                                            >
                                                {
                                                    !isConverting ? (
                                                        <span>Convert</span>
                                                    ) : (
                                                        <div className='flex justify-center items-center gap-[10px]'>
                                                            <span className='text-white'>Processing...</span>
                                                            <TailSpin
                                                                height="18"
                                                                width="18"
                                                                color="#ffffff"
                                                                ariaLabel="tail-spin-loading"
                                                                radius="1"
                                                                wrapperStyle={{}}
                                                                wrapperClass=""
                                                                visible={true}
                                                            />
                                                        </div>
                                                    )
                                                }
                                            </button>
                                        </div>

                                        <div className='col-span-12 md:col-span-6 flex flex-col px-[10.5px]'>
                                            <div className='flex items-center md:items-start h-[33px] leading-[15px]'>{`Avail JWLHADES Balance: ${(jwlhadesBalance / LAMPORTS_PER_SOL).toLocaleString()} JWLHADES`}</div>

                                            <InputBase
                                                sx={{
                                                    flex: 1,
                                                    border: '1px',
                                                    borderStyle: 'solid',
                                                    borderRadius: '5px',
                                                    borderColor: 'gray',
                                                    padding: '2px 5px',
                                                }}
                                                endAdornment={
                                                    <InputAdornment
                                                        position="end"
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => setAmountToStake(jwlhadesBalance / LAMPORTS_PER_SOL)}
                                                    >
                                                        Max
                                                    </InputAdornment>
                                                }
                                                type='number'
                                                placeholder='0.00'
                                                disabled={isProcessing || isStaking}
                                                value={amountToStake != null ? amountToStake : ''}
                                                className='mt-[3.5px]'
                                                onChange={e => setAmountToStake(e.target.value ? Number(e.target.value) : null)}
                                            />

                                            <div className='flex items-center h-[28px] leading-[15px] mt-[7px]'>Whenever staking new JWLHADES, unstake date will be reset.</div>

                                            <button
                                                disabled={isProcessing || isStaking}
                                                className='flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2'
                                                onClick={handleStake}
                                            >
                                                {
                                                    !isStaking ? (
                                                        <span>Stake</span>
                                                    ) : (
                                                        <div className='flex justify-center items-center gap-[10px]'>
                                                            <span className='text-white'>Processing...</span>
                                                            <TailSpin
                                                                height="18"
                                                                width="18"
                                                                color="#ffffff"
                                                                ariaLabel="tail-spin-loading"
                                                                radius="1"
                                                                wrapperStyle={{}}
                                                                wrapperClass=""
                                                                visible={true}
                                                            />
                                                        </div>
                                                    )
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className='col-span-12 md:col-span-6'>
                                    <div className='grid grid-cols-12 gap-[20px] md:gap-0 w-full'>
                                        <div className='col-span-12 md:col-span-6 flex flex-col px-[10.5px]'>
                                            <div className='flex items-center md:items-start h-[33px] leading-[15px]'>{`Staked JWLHADES. Balance: ${(stakedAmount / LAMPORTS_PER_SOL).toLocaleString()}`}</div>

                                            <InputBase
                                                sx={{
                                                    flex: 1,
                                                    border: '1px',
                                                    borderStyle: 'solid',
                                                    borderRadius: '5px',
                                                    borderColor: 'gray',
                                                    padding: '2px 5px',
                                                }}
                                                endAdornment={
                                                    <InputAdornment
                                                        position="end"
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => setAmountToUnstake(stakedAmount / LAMPORTS_PER_SOL)}
                                                    >
                                                        Max
                                                    </InputAdornment>
                                                }
                                                type='number'
                                                placeholder='0.00'
                                                disabled={isProcessing || isUnstaking}
                                                value={amountToUnstake != null ? amountToUnstake : ''}
                                                className='mt-[3.5px]'
                                                onChange={e => setAmountToUnstake(e.target.value ? Number(e.target.value) : null)}
                                            />

                                            <div className='flex items-center h-[28px] leading-[15px] mt-[7px]'>{releaseTime > 0 && `Unstake Date: ${new Date(releaseTime * 1000).toLocaleString()}`}</div>

                                            <button
                                                disabled={isProcessing || isUnstaking}
                                                className='flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2'
                                                onClick={handleUnstake}
                                            >
                                                {
                                                    !isUnstaking ? (
                                                        <span>Unstake</span>
                                                    ) : (
                                                        <div className='flex justify-center items-center gap-[10px]'>
                                                            <span className='text-white'>Processing...</span>
                                                            <TailSpin
                                                                height="18"
                                                                width="18"
                                                                color="#ffffff"
                                                                ariaLabel="tail-spin-loading"
                                                                radius="1"
                                                                wrapperStyle={{}}
                                                                wrapperClass=""
                                                                visible={true}
                                                            />
                                                        </div>
                                                    )
                                                }
                                            </button>
                                        </div>

                                        <div className='col-span-12 md:col-span-6 flex flex-col px-[10.5px]'>
                                            <div className='flex flex-col justify-between items-center h-full'>
                                                <div className='flex flex-col items-center'>
                                                    <div className='text-[21px] font-light h-[33px]'>Total Rewards</div>
                                                    <div>{`${userJwltokenInfo ? (userJwltokenInfo.totalRewards.toNumber()).toLocaleString() : 0} JWLHADES`}</div>
                                                </div>

                                                <button
                                                    disabled={isProcessing || isClaiming}
                                                    className='flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2'
                                                    onClick={handleClaim}
                                                >
                                                    {
                                                        !isClaiming ? (
                                                            <span>Claim</span>
                                                        ) : (
                                                            <div className='flex justify-center items-center gap-[10px]'>
                                                                <span className='text-white'>Processing...</span>
                                                                <TailSpin
                                                                    height="18"
                                                                    width="18"
                                                                    color="#ffffff"
                                                                    ariaLabel="tail-spin-loading"
                                                                    radius="1"
                                                                    wrapperStyle={{}}
                                                                    wrapperClass=""
                                                                    visible={true}
                                                                />
                                                            </div>
                                                        )
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AccordionDetails>
                    </Accordion>
                </div>
            </div>
        </>
    );
};

export default HadesStake;