import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { TailSpin } from 'react-loader-spinner';
import Swiper from 'react-id-swiper';
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
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import {
    convertSecondsToDateTime,
    getApy,
    getBalance,
    getTokenBalance,
    getTokenSupply,
    globalStatePubkey,
    reserveVault,
    useContractInteractor
} from '../../utils';
import { IEpochInfo, IGlobalState, IUserInfoAccount } from '../../interfaces';
import { CONTRACT_DEPLOYED_AT, MAX_FEE_TO_DEPOSIT, MINUTE_IN_MS, MIN_DEPOSIT_AMOUNT, UNBOINDING_PERIOD } from '../../config';
import { wlValidators } from '../../data';
import solLogo from '../../assets/images/sol_logo.png';
import jwlsolLogo from '../../assets/images/jwlsol_logo.png';

const swiperParams = {
    slidesPerView: 'auto',
}

const LiquidStake = () => {
    const wallet = useWallet();
    const { program } = useContractInteractor();

    const [solBalance, setSolBalance] = useState<number>(0);
    const [jwlsolBalance, setJwlsolBalance] = useState<number>(0);
    const [jwlsolSupply, setJwlsolSupply] = useState<number>(0);
    const [sjwlsolBalance, setSjwlsolBalance] = useState<number>(0);
    const [sjwlsolSupply, setSjwlsolSupply] = useState<number>(0);
    const [userInfoAccountInfo, setUserInfoAccountInfo] = useState<IUserInfoAccount>();
    const [globalStateInfo, setGlobalStateInfo] = useState<IGlobalState>();
    const [epochInfo, setEpochInfo] = useState<IEpochInfo>();
    const [isNativeStakeExpanded, setIsNativeStakeExpanded] = useState<boolean>(false);
    const [isTokenStakeExpanded, setIsTokenSTakedExpanded] = useState<boolean>(false);
    const [solDepositAmount, setSolDepositAmount] = useState<number | null>();
    const [reserveRedeemAmount, setReserveRedeemAmount] = useState<number | null>();
    const [jwlsolStakeAmount, setJwlsolStakeAmount] = useState<number | null>();
    const [sjwlsolUnstakeAmount, setSjwlsolUnstakeAmount] = useState<number | null>();
    const [apy, setApy] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDepositingSol, setIsDepositingSol] = useState<boolean>(false);
    const [isReservingRedeem, setIsReservingRedeem] = useState<boolean>(false);
    const [isStakingJwlsol, setIsStakingJwlsol] = useState<boolean>(false);
    const [isUnstakingJwlsol, setIsUnstakingJwlsol] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const initialize = async (isInit?: boolean) => {
        if (isInit) {
            setIsLoading(true);
        }

        try {
            const [globalStateInfo, epochInfo] = await Promise.all([
                program.account.globalState.fetch(globalStatePubkey),
                program.provider.connection.getEpochInfo(),
            ]);

            let solBalance = 0;
            let jwlsolBalance = 0;
            let jwlsolSupply = 0;
            let sjwlsolBalance = 0;
            let sjwlsolSupply = 0;
            let apy = 0;
            let userInfoAccountInfo;

            if (wallet?.publicKey) {
                try {
                    const userInfoAccount = PublicKey.findProgramAddressSync(
                        [
                            Buffer.from('user-info-pda'),
                            wallet.publicKey.toBuffer(),
                        ],
                        program.programId
                    )[0];

                    userInfoAccountInfo = await program.account.userInfoAccount.fetch(userInfoAccount);
                } catch { }

                [solBalance, jwlsolBalance, jwlsolSupply, sjwlsolBalance, sjwlsolSupply, apy] = await Promise.all([
                    getBalance(wallet.publicKey),
                    getTokenBalance(wallet.publicKey, globalStateInfo.jwlsolMint),
                    getTokenSupply(globalStateInfo.jwlsolMint),
                    getTokenBalance(wallet.publicKey, globalStateInfo.sjwlsolMint),
                    getTokenSupply(globalStateInfo?.sjwlsolMint),
                    getApy(
                        Number(globalStateInfo.jwlsolReserve),
                        Number(globalStateInfo.sjwlsolReserve),
                        CONTRACT_DEPLOYED_AT,
                    ),
                ]);

                setUserInfoAccountInfo(userInfoAccountInfo);
            } else {
                [jwlsolSupply, sjwlsolSupply, apy] = await Promise.all([
                    getTokenSupply(globalStateInfo.jwlsolMint),
                    getTokenSupply(globalStateInfo?.sjwlsolMint),
                    getApy(
                        Number(globalStateInfo.jwlsolReserve),
                        Number(globalStateInfo.sjwlsolReserve),
                        CONTRACT_DEPLOYED_AT,
                    ),
                ]);
            }

            console.log({ globalStateInfo });

            setEpochInfo(epochInfo);
            setGlobalStateInfo(globalStateInfo);
            setSolBalance(solBalance);
            setJwlsolBalance(jwlsolBalance);
            setJwlsolSupply(jwlsolSupply);
            setSjwlsolBalance(sjwlsolBalance);
            setSjwlsolSupply(sjwlsolSupply);
            setApy(apy);
        } catch (e) {
            console.log('e', e);
        }

        setIsLoading(false);
    }

    const handleSetMaxDeposit = () => {
        const maxAmountToDeposit = solBalance - MAX_FEE_TO_DEPOSIT * LAMPORTS_PER_SOL;
        if (maxAmountToDeposit > 0) {
            setSolDepositAmount(Number((maxAmountToDeposit / LAMPORTS_PER_SOL).toLocaleString()));
        } else {
            setSolDepositAmount(0);
        }
    }

    const handleDepositSol = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet.');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized.');
        }

        if (!solDepositAmount) {
            return toast.warn('Please input amount to stake.');
        }

        if (solDepositAmount < MIN_DEPOSIT_AMOUNT) {
            return toast.warn(`Deposit amount should be higher than ${MIN_DEPOSIT_AMOUNT}.`);
        }

        setIsProcessing(true);
        setIsDepositingSol(true);

        try {
            const amount = new anchor.BN(solDepositAmount * LAMPORTS_PER_SOL);

            const userInfoAccount = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('user-info-pda'),
                    wallet.publicKey.toBuffer(),
                ],
                program.programId
            )[0];

            const userJwlsolAccount = await getAssociatedTokenAddress(
                globalStateInfo.jwlsolMint,
                wallet.publicKey
            );

            const txh = await program.methods
                .deposit(amount)
                .accounts(
                    {
                        signer: wallet.publicKey,
                        userInfoAccount: userInfoAccount,
                        globalState: globalStatePubkey,
                        reserveVault: reserveVault,
                        jwlsolMint: globalStateInfo.jwlsolMint,
                        jwlsolAuthority: globalStateInfo.jwlsolAuthority,
                        userJwlsolAccount: userJwlsolAccount,
                        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                        systemProgram: anchor.web3.SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
                    }
                )
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to deposit SOL');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to deposit SOL');
        }

        setIsProcessing(false);
        setIsDepositingSol(false);
    }

    const handleReserveRedeem = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized');
        }

        if (!reserveRedeemAmount) {
            return toast.warn('Please input amount to reserve redeem');
        }

        if (reserveRedeemAmount > jwlsolBalance / LAMPORTS_PER_SOL) {
            return toast.warn('Insufficient JWLSOL balance');
        }


        setIsProcessing(true);
        setIsReservingRedeem(true);

        try {
            const amount = new anchor.BN(reserveRedeemAmount * LAMPORTS_PER_SOL);

            const userInfoAccount = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('user-info-pda'),
                    wallet.publicKey.toBuffer(),
                ],
                program.programId
            )[0];

            const userJwlsolAccount = await getAssociatedTokenAddress(
                globalStateInfo.jwlsolMint,
                wallet.publicKey
            );

            const txh = await program.methods
                .reserveRedeem(amount)
                .accounts(
                    {
                        signer: wallet.publicKey,
                        userInfoAccount: userInfoAccount,
                        globalState: globalStatePubkey,
                        jwlsolMint: globalStateInfo.jwlsolMint,
                        jwlsolVault: globalStateInfo.jwlsolVault,
                        userJwlsolAccount: userJwlsolAccount,
                        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                        systemProgram: anchor.web3.SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                    }
                )
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to reserve redeem.');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to reserve redeem.');
        }

        setIsProcessing(false);
        setIsReservingRedeem(false);
    }

    const handleStakeJwlsol = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized');
        }

        if (!jwlsolStakeAmount) {
            return toast.warn('Please input amount to stake');
        }

        if (jwlsolStakeAmount > jwlsolBalance / LAMPORTS_PER_SOL) {
            return toast.warn('Insufficient JWLSOL balance');
        }

        setIsProcessing(true);
        setIsStakingJwlsol(true);

        try {
            const amount = new anchor.BN(jwlsolStakeAmount * LAMPORTS_PER_SOL);

            const userInfoAccount = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('user-info-pda'),
                    wallet.publicKey.toBuffer(),
                ],
                program.programId
            )[0];

            const userJwlsolAccount = await getAssociatedTokenAddress(
                globalStateInfo.jwlsolMint,
                wallet.publicKey
            );

            const userSjwlsolAccount = await getAssociatedTokenAddress(
                globalStateInfo.sjwlsolMint,
                wallet.publicKey
            );

            const txh = await program.methods
                .stakeJwlsol(amount)
                .accounts(
                    {
                        signer: wallet.publicKey,
                        userInfoAccount: userInfoAccount,
                        globalState: globalStatePubkey,
                        jwlsolMint: globalStateInfo.jwlsolMint,
                        jwlsolVault: globalStateInfo.jwlsolVault,
                        sjwlsolMint: globalStateInfo.sjwlsolMint,
                        sjwlsolAuthority: globalStateInfo.sjwlsolAuthority,
                        userJwlsolAccount: userJwlsolAccount,
                        userSjwlsolAccount: userSjwlsolAccount,
                        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                        systemProgram: anchor.web3.SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
                    }
                )
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to stake JWLSOL');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to stake JWLSOL');
        }

        setIsProcessing(false);
        setIsStakingJwlsol(false);
    }

    const handleUnstakSjwlsol = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized');
        }

        if (!sjwlsolUnstakeAmount) {
            return toast.warn('Please input amount to unstake');
        }

        if (sjwlsolUnstakeAmount > sjwlsolBalance / LAMPORTS_PER_SOL) {
            return toast.warn('Insufficient SJWLSOL balance');
        }

        setIsProcessing(true);
        setIsUnstakingJwlsol(true);

        try {
            const amount = new anchor.BN(sjwlsolUnstakeAmount * LAMPORTS_PER_SOL);

            const userInfoAccount = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('user-info-pda'),
                    wallet.publicKey.toBuffer(),
                ],
                program.programId
            )[0];

            const userJwlsolAccount = await getAssociatedTokenAddress(
                globalStateInfo.jwlsolMint,
                wallet.publicKey
            );

            const userSjwlsolAccount = await getAssociatedTokenAddress(
                globalStateInfo.sjwlsolMint,
                wallet.publicKey
            );

            const txh = await program.methods
                .unstakeSjwlsol(amount)
                .accounts(
                    {
                        signer: wallet.publicKey,
                        userInfoAccount: userInfoAccount,
                        globalState: globalStatePubkey,
                        jwlsolMint: globalStateInfo.jwlsolMint,
                        jwlsolVault: globalStateInfo.jwlsolVault,
                        jwlsolVaultAuthority: globalStateInfo.jwlsolVaultAuthority,
                        sjwlsolMint: globalStateInfo.sjwlsolMint,
                        userJwlsolAccount: userJwlsolAccount,
                        userSjwlsolAccount: userSjwlsolAccount,
                        tokenProgram: TOKEN_PROGRAM_ID,
                    }
                )
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to unstake SJWLSOL');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to unstake SJWLSOL');
        }

        setIsProcessing(false);
        setIsUnstakingJwlsol(false);
    }

    useEffect(() => {
        const getEpochInfo = async () => {
            const epochInfo = await program.provider.connection.getEpochInfo();
            setEpochInfo(epochInfo);
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
                <div className='text-[14px]'>JWLSOL is a SOL-pegged stablecoin.</div>
                <div className='text-[14px]'>Mint SOL for JWLSOL 1:1 which will be sent for validator staking when able to. A dynamic % will be sent for LP creation. Stake JWLSOL for SJWLSOL which will accrue staking yield. You can now swap SOL-JWLSOL at Orca.</div>
            </div>

            <div className='flex flex-col w-full gap-[5px] mt-[14px]'>
                <div className='text-[17px]'>List of Validators</div>

                <div className='w-full'>
                    <Swiper {...swiperParams}>
                        {
                            wlValidators.map((item, index) => {
                                return (
                                    <div
                                        key={index}
                                        className='flex justify-center items-center gap-[5px] !w-fit p-[7px]'
                                    >
                                        <img src={item.logo} alt='validator-logo' className='w-[30px] h-[30px]' />
                                        <div>{item.name}</div>
                                    </div>
                                )
                            })
                        }
                    </Swiper>
                </div>
            </div>

            <div className='flex flex-col items-center mt-[21px]'>
                <div className='text-[21px] text-[#54f5b7] leading-[1.2]'>{`Epoch ${epochInfo ? epochInfo.epoch : '-'}`}</div>
                <div className='mt-[21px]'>{`${epochInfo ? convertSecondsToDateTime((epochInfo.slotsInEpoch - epochInfo.slotIndex) * 0.4) : 0} left until next Epoch`}</div>
                <div className='w-full h-[14px] mt-[14px]'>
                    <LinearProgress
                        value={epochInfo ? (epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100 : 0}
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
            </div>

            <div className='flex flex-col gap-[21px] w-full mt-[21px]'>
                {/* Native staking */}
                <div className='w-full bg-[rgb(18,18,18)] bg-[linear-gradient(rgba(255,255,255,0.05),rgba(255,255,255,0.05))] rounded-[4px]'>
                    <Accordion
                        expanded={isNativeStakeExpanded}
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
                                            <img src={solLogo} alt='sol-logo' className='w-full' />
                                        </div>
                                        <div>SOL</div>
                                    </div>
                                </div>

                                <div className='col-span-12 md:col-span-2 flex flex-col justify-center md:px-[10.5px]'>
                                    <div>TVL</div>
                                    <div>{`${(jwlsolSupply / LAMPORTS_PER_SOL).toLocaleString()} JWLSOL`}</div>
                                </div>

                                <div className='col-span-12 md:col-span-1 md:px-[10.5px]'></div>

                                <div className='col-span-12 md:col-span-3 flex items-center md:px-[10.5px]'>
                                    <div className='flex justify-between items-center w-full'>
                                        <div>Your balance</div>
                                        <div className='text-end'>
                                            <div>{`${(solBalance / LAMPORTS_PER_SOL).toLocaleString()} SOL`}</div>
                                            <div>{`${(jwlsolBalance / LAMPORTS_PER_SOL).toLocaleString()} JWLSOL`}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className='col-span-12 md:col-span-1 md:px-[10.5px]'></div>

                                <div className='col-span-12 md:col-span-2 flex items-center md:px-[10.5px]'>
                                    <button
                                        className='flex justify-center items-center w-full p-[7px] border border-solid border-[rgba(84,245,183,0.6)] rounded-[5px]'
                                        onClick={() => setIsNativeStakeExpanded(!isNativeStakeExpanded)}
                                    >
                                        <span>Mint / Redeem</span>
                                        {
                                            isNativeStakeExpanded ? (
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
                                    <div className='grid grid-cols-12 gap-[10px] md:gap-0 w-full'>
                                        <div className='col-span-12 md:col-span-6 flex flex-col px-[10.5px]'>
                                            <div>{`Avail SOL Balance: ${(solBalance / LAMPORTS_PER_SOL).toLocaleString()} SOL`}</div>

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
                                                        onClick={handleSetMaxDeposit}
                                                    >
                                                        Max
                                                    </InputAdornment>
                                                }
                                                type='number'
                                                placeholder='0.00'
                                                disabled={isProcessing || isDepositingSol}
                                                value={solDepositAmount != null ? solDepositAmount : ''}
                                                className='mt-[3.5px]'
                                                onChange={e => setSolDepositAmount(e.target.value ? Number(e.target.value) : null)}
                                            />

                                            <button
                                                disabled={isProcessing || isDepositingSol}
                                                className='flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2'
                                                onClick={handleDepositSol}
                                            >
                                                {
                                                    !isDepositingSol ? (
                                                        <span>Mint</span>
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
                                            <div>{`Avail JWLSOL Balance: ${(jwlsolBalance / LAMPORTS_PER_SOL).toLocaleString()} JWLSOL`}</div>

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
                                                        onClick={() => setReserveRedeemAmount(jwlsolBalance / LAMPORTS_PER_SOL)}
                                                    >
                                                        Max
                                                    </InputAdornment>
                                                }
                                                type='number'
                                                placeholder='0.00'
                                                value={reserveRedeemAmount != null ? reserveRedeemAmount : ''}
                                                className='mt-[3.5px]'
                                                onChange={e => setReserveRedeemAmount(e.target.value ? Number(e.target.value) : null)}
                                            />

                                            <button
                                                disabled={isProcessing || isReservingRedeem}
                                                className='flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2'
                                                onClick={handleReserveRedeem}
                                            >
                                                {
                                                    !isReservingRedeem ? (
                                                        <span>Redeem</span>
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

                                <div className='block md:hidden col-span-12 w-full italic px-[10.5px]'>
                                    If you have already requested JWLSOL to be redeemed, the new redeem attempts will increase the unbonding epoch - you will need to wait for the unbonding period again.
                                </div>

                                <div className='col-span-12 md:col-span-6'>
                                    <div className='grid grid-cols-12 gap-[10px] md:gap-0 w-full'>
                                        <div className='col-span-12 md:col-span-4 px-[10.5px]'>
                                            <div className='flex justify-start md:justify-center'>
                                                <div>SOL Reserved to Redeem</div>
                                            </div>
                                            <div className='flex justify-start md:justify-center mt-[5px] md:mt-[21px]'>
                                                <div>{userInfoAccountInfo && (userInfoAccountInfo.reservedRedeemAmount.toNumber() / LAMPORTS_PER_SOL).toLocaleString()}</div>
                                            </div>
                                        </div>

                                        <div className='col-span-12 md:col-span-4 px-[10.5px]'>
                                            <div className='flex justify-start md:justify-center'>
                                                <div>Unbonding Epoch</div>
                                            </div>
                                            <div className='flex justify-start md:justify-center mt-[5px] md:mt-[21px]'>
                                                <div>
                                                    {
                                                        userInfoAccountInfo && (userInfoAccountInfo.reservedRedeemAmount.toNumber() > 0 || userInfoAccountInfo.approvedRedeemAmount.toNumber() > 0) ? (
                                                            userInfoAccountInfo.lastRedeemReservedEpoch.toNumber() + UNBOINDING_PERIOD + 1
                                                        ) : (
                                                            '-'
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        <div className='col-span-12 md:col-span-4 px-[10.5px]'>
                                            <div className='flex justify-start md:justify-center'>
                                                <div>SOL Approved to Redeem</div>
                                            </div>
                                            <div className='flex justify-start md:justify-center mt-[5px] md:mt-[21px]'>
                                                <div>{userInfoAccountInfo && (userInfoAccountInfo.approvedRedeemAmount.toNumber() / LAMPORTS_PER_SOL).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className='hidden md:block col-span-12 mt-[14px]'>
                                    <div className='grid grid-cols-12 gap-[10px] md:gap-0 w-full'>
                                        <div className='col-span-3 px-[10.5px]'></div>
                                        <div className='col-span-9 px-[10.5px] italic'>
                                            If you have already requested JWLSOL to be redeemed, the new redeem attempts will increase the unbonding epoch - you will need to wait for the unbonding period again.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AccordionDetails>
                    </Accordion>
                </div>

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
                                            <img src={jwlsolLogo} alt='jwlsol-logo' className='w-full' />
                                        </div>
                                        <div className='flex flex-col justify-center'>
                                            <div>JWLSOL</div>
                                            <div className='text-[11.2px]'>{`1 SJWLSOL = ${globalStateInfo && globalStateInfo?.jwlsolReserve?.toNumber() > 0 ? (globalStateInfo?.jwlsolReserve?.toNumber() / globalStateInfo?.sjwlsolReserve?.toNumber()).toFixed(5) : 1} JWLSOL`}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className='col-span-12 md:col-span-2 flex flex-col justify-center md:px-[10.5px]'>
                                    <div>TVL</div>
                                    <div>{`${(sjwlsolSupply / LAMPORTS_PER_SOL).toLocaleString()} SJWLSOL`}</div>
                                </div>

                                <div className='col-span-12 md:col-span-1 flex flex-col justify-center md:px-[10.5px]'>
                                    <div>APY</div>
                                    <div className='text-[#54f5b7]'>{`${apy.toLocaleString()} %`}</div>
                                </div>

                                <div className='col-span-12 md:col-span-3 flex items-center md:px-[10.5px]'>
                                    <div className='flex justify-between items-center w-full'>
                                        <div>Your balance</div>
                                        <div className='text-end'>
                                            <div>{`${(jwlsolBalance / LAMPORTS_PER_SOL).toLocaleString()} JWLSOL`}</div>
                                            <div>{`${(sjwlsolBalance / LAMPORTS_PER_SOL).toLocaleString()} SJWLSOL`}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className='col-span-12 md:col-span-1 md:px-[10.5px]'></div>

                                <div className='col-span-12 md:col-span-2 flex items-center md:px-[10.5px]'>
                                    <button
                                        className='flex justify-center items-center w-full p-[7px] border border-solid border-[rgba(84,245,183,0.6)] rounded-[5px]'
                                        onClick={() => setIsTokenSTakedExpanded(!isTokenStakeExpanded)}
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
                            <div className='grid grid-cols-12 w-full mt-[14px]'>
                                <div className='col-span-12 md:col-span-6'>
                                    <div className='grid grid-cols-12 gap-[10px] md:gap-0 w-full'>
                                        <div className='col-span-12 md:col-span-6 flex flex-col px-[10.5px]'>
                                            <div>{`Avail JWLSOL Balance: ${(jwlsolBalance / LAMPORTS_PER_SOL).toLocaleString()} JWLSOL`}</div>

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
                                                        onClick={() => setJwlsolStakeAmount(jwlsolBalance / LAMPORTS_PER_SOL)}
                                                    >
                                                        Max
                                                    </InputAdornment>
                                                }
                                                type='number'
                                                placeholder='0.00'
                                                disabled={isProcessing || isStakingJwlsol}
                                                value={jwlsolStakeAmount != null ? jwlsolStakeAmount : ''}
                                                className='mt-[3.5px]'
                                                onChange={e => setJwlsolStakeAmount(e.target.value ? Number(e.target.value) : null)}
                                            />

                                            <button
                                                disabled={isProcessing || isStakingJwlsol}
                                                className='flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2'
                                                onClick={handleStakeJwlsol}
                                            >
                                                {
                                                    !isStakingJwlsol ? (
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

                                        <div className='col-span-12 md:col-span-6 flex flex-col px-[10.5px]'>
                                            <div>{`Avail SJWLSOL Balance: ${(sjwlsolBalance / LAMPORTS_PER_SOL).toLocaleString()} SJWLSOL`}</div>

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
                                                        onClick={() => setSjwlsolUnstakeAmount(sjwlsolBalance / LAMPORTS_PER_SOL)}
                                                    >
                                                        Max
                                                    </InputAdornment>
                                                }
                                                type='number'
                                                placeholder='0.00'
                                                disabled={isProcessing || isUnstakingJwlsol}
                                                value={sjwlsolUnstakeAmount != null ? sjwlsolUnstakeAmount : ''}
                                                className='mt-[3.5px]'
                                                onChange={e => setSjwlsolUnstakeAmount(e.target.value ? Number(e.target.value) : null)}
                                            />

                                            <button
                                                disabled={isProcessing || isUnstakingJwlsol}
                                                className='flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2'
                                                onClick={handleUnstakSjwlsol}
                                            >
                                                {
                                                    !isUnstakingJwlsol ? (
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
                                    </div>
                                </div>
                                <div className='col-span-12 md:col-span-6'>
                                </div>
                            </div>
                        </AccordionDetails>
                    </Accordion>
                </div>
            </div>
        </>
    );
};

export default LiquidStake;