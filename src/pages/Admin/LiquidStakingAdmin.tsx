import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { TailSpin } from 'react-loader-spinner';
import {
    OutlinedInput,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import * as anchor from '@coral-xyz/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair, LAMPORTS_PER_SOL, PublicKey, VoteProgram } from '@solana/web3.js';
import { IGlobalState, IValidator } from '../../interfaces';
import { connection, getBalance, globalStatePubkey, useContractInteractor } from '../../utils';
import { adminWallets } from '../../config';

const LiquidStakingAdmin = () => {
    const wallet = useWallet();
    const navigate = useNavigate();
    const { program } = useContractInteractor();
    const [solBalance, setSolBalance] = useState<number>(0);
    const [globalStateInfo, setGlobalStateInfo] = useState<IGlobalState>();
    const [validators, setValidators] = useState<IValidator[]>([]);
    const [validatorVoteAccount, setValidatorVoteAccount] = useState<string>('');
    const [reservingAmount, setReservingAmount] = useState<number | null>(null);
    const [claimingAmount, setClaimingAmount] = useState<number | null>(null);
    const [fundingAmount, setFundingAmount] = useState<number | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
    const [isAddingValidator, setIsAddingValidator] = useState<boolean>(false);
    const [isRemovingValidator, setIsRemovingValidator] = useState<boolean>(false);
    const [isReservingClaim, setIsReservingClaim] = useState<boolean>(false);
    const [isClaiming, setIsClaiming] = useState<boolean>(false);
    const [isFunding, setIsFunding] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const initialize = async (isInit?: boolean) => {
        if (isInit) {
            setIsLoading(true);
        }

        try {
            if (wallet?.publicKey) {
                const [solBalance, globalStateInfo, validators] = await Promise.all([
                    getBalance(wallet.publicKey),
                    program.account.globalState.fetch(globalStatePubkey),
                    program.account.validator.all(),
                ]);

                setSolBalance(solBalance);
                setGlobalStateInfo(globalStateInfo);
                setValidators(validators.map(item => {
                    return {
                        voteAccount: item.account.voteAccount,
                        validatorStore: item.account.validatorStore,
                        votingScore: item.account.votingScore,
                        currentScore: item.account.currentScore,
                    }
                }));
            }
        } catch { }

        setIsLoading(false);
    }

    const handleAddValidator = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet.');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized.');
        }

        if (!validatorVoteAccount) {
            return toast.warn('Please input validator vote account.');
        }

        const voteAccountPubkey = new PublicKey(validatorVoteAccount);

        if (validators.find(x => x.voteAccount.toString() == voteAccountPubkey.toString())) {
            return toast.warn('Already added.');
        }

        setIsProcessing(true);
        setIsAddingValidator(true);

        try {
            const voteAccountInfo = await connection.getAccountInfo(voteAccountPubkey);
            if (!voteAccountInfo || voteAccountInfo?.owner.toString() != VoteProgram.programId.toString()) {
                setIsProcessing(false);
                setIsAddingValidator(false);

                return toast.warning('Invalid vote account.');
            }

            const validator = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('validator'),
                    voteAccountPubkey.toBuffer(),
                ],
                program.programId
            )[0];

            const validatorStore = Keypair.generate();

            const txh = await program.methods
                .addValidator()
                .accounts(
                    {
                        signer: wallet.publicKey,
                        globalState: globalStatePubkey,
                        validator: validator,
                        validatorVoteAccount: voteAccountPubkey,
                        validatorStore: validatorStore.publicKey,
                        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    }
                )
                .preInstructions([
                    await program.account.validatorStore.createInstruction(validatorStore),
                ])
                .signers([validatorStore])
                .rpc({ skipPreflight: true });

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to add validator.');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to add validator.');
        }

        setIsProcessing(false);
        setIsAddingValidator(false);
    }

    const handleRemoveValidator = async (validatorVoteAccount: string, selectedIndex: number) => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet.');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized.');
        }

        if (!validatorVoteAccount) {
            return toast.warn('Please input validator vote account.');
        }

        const voteAccountPubkey = new PublicKey(validatorVoteAccount);

        if (!validators.find(x => x.voteAccount.toString() == voteAccountPubkey.toString())) {
            return toast.warn('Invalid vote account.');
        }

        setSelectedIndex(selectedIndex);
        setIsRemovingValidator(true);
        setIsProcessing(true);

        try {
            const validator = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('validator'),
                    voteAccountPubkey.toBuffer(),
                ],
                program.programId
            )[0];

            const validatorInfo = await program.account.validator.fetch(validator);

            const txh = await program.methods
                .removeValidator()
                .accounts(
                    {
                        signer: wallet.publicKey,
                        globalState: globalStatePubkey,
                        validator: validator,
                        validatorVoteAccount: voteAccountPubkey,
                        validatorStore: validatorInfo.validatorStore,
                    }
                )
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to remove validator.');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to remove validator.');
        }

        setIsRemovingValidator(false);
        setIsProcessing(false);
        setSelectedIndex(undefined);
    }

    const handleFund = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet.');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized.');
        }

        if (!fundingAmount) {
            return toast.warn('Please input amount to fund.');
        }

        setIsProcessing(true);
        setIsFunding(true);

        try {
            const amount = new anchor.BN(fundingAmount * LAMPORTS_PER_SOL);
            const txh = await program.methods
                .fund(amount)
                .accounts(
                    {
                        signer: wallet.publicKey,
                        globalState: globalStatePubkey,
                        reserveVault: globalStateInfo.reserveVault,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    }
                )
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to fund.');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to fund.');
        }

        setIsProcessing(false);
        setIsFunding(false);
    }

    const handleReserveClaim = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet.');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized.');
        }

        if (!reservingAmount) {
            return toast.warn('Please input amount to reserve claiming.');
        }

        setIsProcessing(true);
        setIsReservingClaim(true);

        try {
            const amount = new anchor.BN(reservingAmount * LAMPORTS_PER_SOL);
            const txh = await program.methods
                .reserveClaim(amount)
                .accounts(
                    {
                        signer: wallet.publicKey,
                        globalState: globalStatePubkey,
                    }
                )
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to reserve claiming.');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to reserve claiming.');
        }

        setIsProcessing(false);
        setIsReservingClaim(false);
    }

    const handleClaim = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet.');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized.');
        }

        if (!claimingAmount) {
            return toast.warn('Please input amount to claim.');
        }

        setIsProcessing(true);
        setIsClaiming(true);

        try {
            const amount = new anchor.BN(claimingAmount * LAMPORTS_PER_SOL);
            const txh = await program.methods
                .claimRewards(amount)
                .accounts(
                    {
                        signer: wallet.publicKey,
                        globalState: globalStatePubkey,
                        reserveVault: globalStateInfo.reserveVault,
                    }
                )
                .rpc();

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to claim.');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to claim.');
        }

        setIsProcessing(false);
        setIsClaiming(false);
    }

    useEffect(() => {
        if (wallet?.publicKey) {
            if (!adminWallets.includes(wallet.publicKey.toString())) {
                navigate('/');
            }
        }

        (async () => {
            await initialize();
        })();
    }, [wallet?.publicKey]);

    return (

        <div className='flex flex-col items-center gap-[30px] w-full'>
            <h1 className='text-[42px]'>Manage Liquid Staking</h1>

            {/* Manage validators */}
            <div className='flex flex-col items-center w-full max-w-[650px]'>
                <h1 className='w-full text-[32px] text-center'>Manage validators</h1>

                {/* Add validator */}
                <div className='flex flex-col mt-[20px] w-full'>
                    <h3 className='text-[18px]'>Add validator</h3>

                    <div className='flex justify-center items-center gap-[10px]'>
                        <OutlinedInput
                            id='outlined-validator'
                            aria-describedby='outlined-validator-helper-text'
                            fullWidth
                            value={validatorVoteAccount}
                            onChange={e => setValidatorVoteAccount(e.target.value)}
                            className='grow'
                            placeholder='Validator Vote Account'
                            sx={{
                                '& .MuiOutlinedInput-input': {
                                    padding: '7px 10px'
                                }
                            }}
                        />

                        <button
                            disabled={isProcessing || isAddingValidator}
                            className='flex justify-center items-center min-w-[120px] p-[7px_21px] rounded-[5px] btn-primary2'
                            onClick={handleAddValidator}
                        >
                            {
                                !isAddingValidator ? (
                                    <span>Add</span>
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

                {/* Remove validator */}
                <div className='flex flex-col mt-[30px] w-full'>
                    <h3 className='text-[18px]'>Remove validator</h3>

                    {
                        !isLoading ? (
                            validators.length > 0 ? (
                                <TableContainer>
                                    <Table sx={{ width: '100%' }} aria-label="simple table">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>VoteAccount</TableCell>
                                                <TableCell align="center">Action</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {validators.map((row, index) => (
                                                <TableRow
                                                    key={index}
                                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                >
                                                    <TableCell component="th" scope="row">
                                                        {row.voteAccount.toString()}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <button
                                                            disabled={isProcessing || isRemovingValidator}
                                                            className='flex justify-center items-center min-w-[80px] p-[7px_21px] rounded-[5px] btn-primary2 mx-auto'
                                                            onClick={() => handleRemoveValidator(row.voteAccount.toString(), index)}
                                                        >
                                                            {
                                                                !(isRemovingValidator && selectedIndex == index) ? (
                                                                    <span>Remove</span>
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
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <div className='flex justify-center items-center'>
                                    <span className='text-[#808080]'>No items</span>
                                </div>
                            )
                        ) : (
                            <div className='flex justify-center items-center gap-[10px]'>
                                <span className='text-[#808080]'>Loading...</span>
                                <TailSpin
                                    height="18"
                                    width="18"
                                    color="#808080"
                                    ariaLabel="tail-spin-loading"
                                    radius="1"
                                    wrapperStyle={{}}
                                    wrapperClass=""
                                    visible={true}
                                />
                            </div>
                        )
                    }
                </div>
            </div>

            {/* Manage staking rewards */}
            <div className='flex flex-col items-center gap-[20px] w-full'>
                <h1 className='w-full text-[32px] text-center'>Manage staking rewards</h1>

                <div className='flex flex-col gap-[20px] w-full max-w-[1024px] bg-[#0f1720] rounded-[12px] p-[30px]'>
                    <div className='grid grid-cols-3'>
                        {/* Total sol earned */}
                        <div className='flex flex-col gap-[5px]'>
                            <span className='text-[16px] font-semibold'>Total SOL Earned</span>
                            <span>{`${globalStateInfo && (Number(globalStateInfo.totalSolEarned) / LAMPORTS_PER_SOL).toLocaleString()} SOL`}</span>
                        </div>

                        {/* Total sol reserved to claim */}
                        <div className='flex flex-col gap-[5px]'>
                            <span className='text-[16px] font-semibold'>Total SOL Reserved to Claim</span>
                            <span>{`${globalStateInfo && (Number(globalStateInfo.totalSolReservedToClaim) / LAMPORTS_PER_SOL).toLocaleString()} SOL`}</span>
                        </div>

                        {/* Total sol available to claim */}
                        <div className='flex flex-col gap-[5px]'>
                            <span className='text-[16px] font-semibold'>Total SOL Available to Claim</span>
                            <span>{`${globalStateInfo && (Number(globalStateInfo.totalSolAvailableToUnstake) / LAMPORTS_PER_SOL).toLocaleString()} SOL`}</span>
                        </div>
                    </div>

                    <div className='flex justify-between items-center gap-[50px]'>
                        {/* Reserve claim */}
                        <div className='flex flex-col gap-[5px] w-1/2'>
                            <div>Reserve claim</div>

                            <div className='flex justify-between items-center gap-[10px] w-full'>
                                <OutlinedInput
                                    id='outlined-reserve-claim'
                                    aria-describedby='outlined-reserve-claim-helper-text'
                                    fullWidth
                                    type='number'
                                    value={reservingAmount != null ? reservingAmount : ''}
                                    onChange={e => setReservingAmount(e?.target?.value ? Number(e.target.value) : null)}
                                    className='grow'
                                    placeholder='Input amount'
                                    sx={{
                                        '& .MuiOutlinedInput-input': {
                                            padding: '7px 10px'
                                        }
                                    }}
                                />

                                <button
                                    disabled={isProcessing || isReservingClaim}
                                    className='flex justify-center items-center min-w-[120px] p-[7px_21px] rounded-[5px] btn-primary2'
                                    onClick={handleReserveClaim}
                                >
                                    {
                                        !isReservingClaim ? (
                                            <span>Reserve</span>
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

                        {/* Claim rewards */}
                        <div className='flex flex-col gap-[5px] w-1/2'>
                            <div>Claim rewards</div>

                            <div className='flex justify-between items-center gap-[10px] w-full'>
                                <OutlinedInput
                                    id='outlined-claim-reward'
                                    aria-describedby='outlined-claim-reward-helper-text'
                                    fullWidth
                                    type='number'
                                    value={claimingAmount != null ? claimingAmount : ''}
                                    onChange={e => setClaimingAmount(e?.target?.value ? Number(e.target.value) : null)}
                                    className='grow'
                                    placeholder='Input amount'
                                    sx={{
                                        '& .MuiOutlinedInput-input': {
                                            padding: '7px 10px'
                                        }
                                    }}
                                />

                                <button
                                    disabled={isProcessing || isClaiming}
                                    className='flex justify-center items-center min-w-[120px] p-[7px_21px] rounded-[5px] btn-primary2'
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

            {/* Fund */}
            <div className='flex flex-col items-center w-full max-w-[650px]'>
                <h1 className='w-full text-[32px] text-center'>Fund</h1>

                {/* Fund */}
                <div className='flex flex-col mt-[20px] w-full'>
                    <div className='flex flex-col gap-[5px]'>
                        <div>{`Avail SOL balance: ${(solBalance / LAMPORTS_PER_SOL).toLocaleString()}`}</div>

                        <div className='flex justify-center items-center gap-[10px]'>
                            <OutlinedInput
                                id='outlined-fund'
                                aria-describedby='outlined-fund-helper-text'
                                fullWidth
                                value={fundingAmount != null ? fundingAmount : ''}
                                type='number'
                                onChange={e => setFundingAmount(e?.target?.value ? Number(e.target.value) : null)}
                                className='grow'
                                placeholder='Input amount'
                                sx={{
                                    '& .MuiOutlinedInput-input': {
                                        padding: '7px 10px'
                                    }
                                }}
                            />

                            <button
                                disabled={isProcessing || isFunding}
                                className='flex justify-center items-center min-w-[120px] p-[7px_21px] rounded-[5px] btn-primary2'
                                onClick={handleFund}
                            >
                                {
                                    !isFunding ? (
                                        <span>Fund</span>
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
    );
};

export default LiquidStakingAdmin;