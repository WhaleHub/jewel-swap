import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { TailSpin } from 'react-loader-spinner';
import { PieChart } from 'react-minimal-pie-chart';
import { InputAdornment, OutlinedInput, Slider } from '@mui/material';
import { HttpsOutlined as HttpsOutlinedIcon } from '@mui/icons-material';
import { LAMPORTS_PER_SOL, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { IGlobalState, IPieChartData } from '../../interfaces';
import { defaultColor, sliderMarks, wlValidators } from '../../data';
import { globalStatePubkey, sliderValueLabelFormat, useContractInteractor } from '../../utils';
import { VOTE_COOLDOWN } from '../../config';
import solLogo from '../../assets/images/sol_logo.png';
import vejwlsol from '../../assets/images/vejwlsol.png';

const Gauge = () => {
    const wallet = useWallet();
    const { program } = useContractInteractor();
    const [globalStateInfo, setGlobalStateInfo] = useState<IGlobalState>();
    const [selectedIndex, setSelectedIndex] = useState<number>();
    const [voteAllocations, setVoteAllocations] = useState<IPieChartData[]>([]);
    const [totalVejwlsolVoted, setTotalVejwlsolVoted] = useState<number>(0);
    const [vejwlsolUnused, setVejwlsolUnused] = useState<number>(0);
    const [weight, setWeight] = useState<number>(0);
    const [selectedValidatorIndex, setSelectedValidatorIndex] = useState<number | undefined>();
    const [totalVotingPointForUser, setTotalVotingPointForUser] = useState<number>(0);
    const [vejwlsolAmount, setVejwlsolAmount] = useState<number>(0);
    const [isVoting, setIsVoting] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const initialize = async (isInit?: boolean) => {
        if (isInit) {
            setIsLoading(true);
        }

        try {
            const [globalStateInfo, validators, userInfoAccounts] = await Promise.all([
                program.account.globalState.fetch(globalStatePubkey),
                program.account.validator.all(),
                program.account.userInfoAccount.all(),
            ]);

            const totalCurrentScore = validators.reduce((sum, obj) => sum + obj.account.currentScore.toNumber(), 0);

            let totalVejwlsolVoted = 0;
            let vejwlsolUnused = 0;
            await Promise.all(userInfoAccounts.map(async (item, _) => {
                totalVejwlsolVoted += item.account.votedVejwlsolAmount.toNumber();
                if (item.account.vejwlsolAmount.toNumber() > item.account.votedVejwlsolAmount.toNumber()) {
                    vejwlsolUnused += item.account.vejwlsolAmount.toNumber() - item.account.votedVejwlsolAmount.toNumber();
                }
            }));

            let userToValidatorPubkeys: PublicKey[] = [];
            if (wallet?.publicKey) {
                const targetUserInfoAccount = userInfoAccounts.find(x => x.account.userAddress.toString() == wallet.publicKey?.toString());
                if (targetUserInfoAccount) {
                    setVejwlsolAmount(targetUserInfoAccount.account.vejwlsolAmount.toNumber());
                }

                userToValidatorPubkeys = validators.map(item => {
                    const validator = PublicKey.findProgramAddressSync(
                        [
                            Buffer.from('validator'),
                            item.account.voteAccount.toBuffer(),
                        ],
                        program.programId
                    )[0];

                    const userToValidator = PublicKey.findProgramAddressSync(
                        [
                            Buffer.from('user-to-validator'),
                            wallet?.publicKey!.toBuffer(),
                            validator.toBuffer(),
                        ],
                        program.programId
                    )[0];

                    return userToValidator;
                });
            }

            const userToValidatorInfos = await program.account.userToValidator.fetchMultiple(userToValidatorPubkeys);

            const voteAllocations: IPieChartData[] = [];

            let selectedIndex = 0;
            let maxValue = 0;
            let totalVotingPointForUser = 0;
            for (let i = 0; i < validators.length; i++) {
                let votingPoint = 0;
                let lastVotedAt = 0;

                const item = validators[i];

                if (userToValidatorInfos[i] != null && userToValidatorInfos[i] != undefined) {
                    votingPoint = userToValidatorInfos[i]?.votingPoint?.toNumber();
                    lastVotedAt = userToValidatorInfos[i]?.lastVotedAt?.toNumber();
                    totalVotingPointForUser += votingPoint;
                }

                const targetValidator = wlValidators.find(x => x.voteAccount == item.account.voteAccount.toString());

                const allocationValue = totalCurrentScore > 0
                    ? item.account.currentScore.toNumber() / totalCurrentScore
                    : 1 / validators.length;

                if (allocationValue > maxValue) {
                    maxValue = allocationValue;
                    selectedIndex = i;
                }

                const rowData = {
                    title: targetValidator?.name || 'Anonymous',
                    value: allocationValue,
                    color: targetValidator?.color || defaultColor,
                    voteAccount: item.account.voteAccount,
                    votingPoint,
                    lastVotedAt,
                };

                voteAllocations.push(rowData);
            };

            console.log({ voteAllocations });

            setSelectedIndex(selectedIndex);
            setTotalVotingPointForUser(totalVotingPointForUser);
            setTotalVejwlsolVoted(totalVejwlsolVoted);
            setVejwlsolUnused(vejwlsolUnused);
            setVoteAllocations(voteAllocations);
            setGlobalStateInfo(globalStateInfo);
        } catch (e) {
            console.log('e', e);
        }

        setIsLoading(false);
    }

    const handleSetWeight = (weight: number) => {
        if (vejwlsolAmount > 0 && vejwlsolAmount > totalVotingPointForUser) {
            const maxWeight = Number(((vejwlsolAmount - totalVotingPointForUser) / vejwlsolAmount * 100).toFixed(2));
            setWeight(weight > maxWeight ? maxWeight : weight);
        } else {
            setWeight(0);
        }
    }

    const handleVote = async () => {
        if (!wallet?.publicKey) {
            return toast.warn('Please connect wallet');
        }

        if (!globalStateInfo) {
            return toast.warn('Global state not initialized');
        }

        if (selectedValidatorIndex == undefined) {
            return toast.warn('Please select validator');
        }

        setIsVoting(true);

        try {
            const voteAccountPubkey = voteAllocations[selectedValidatorIndex].voteAccount;

            const userInfoAccount = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('user-info-pda'),
                    wallet.publicKey.toBuffer(),
                ],
                program.programId
            )[0];

            const validator = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('validator'),
                    voteAccountPubkey.toBuffer(),
                ],
                program.programId
            )[0];

            const userToValidator = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('user-to-validator'),
                    wallet.publicKey.toBuffer(),
                    validator.toBuffer(),
                ],
                program.programId
            )[0];

            const txh = await program.methods
                .voteValidator(new anchor.BN(weight * 100))
                .accounts(
                    {
                        signer: wallet.publicKey,
                        validator: validator,
                        userInfoAccount: userInfoAccount,
                        userToValidator: userToValidator,
                        globalState: globalStatePubkey,
                        rent: SYSVAR_RENT_PUBKEY,
                        systemProgram: SystemProgram.programId,
                    }
                )
                .rpc({ skipPreflight: true });

            console.log('txh: ', txh);

            await initialize();

            toast.success('Successful to vote');
        } catch (e) {
            console.log('e', e);
            toast.error('Failed to vote');
        }

        setIsVoting(false);
    }

    useEffect(() => {
        (async () => {
            await initialize();
        })();
    }, [wallet?.publicKey]);

    return (
        <div className='flex justify-center w-full mt-[56px] md:mt-[40px] px-[10.5px]'>
            <div className='flex flex-col w-full max-w-[1320px] bg-[#0f1720] rounded-[12px] p-[30px_20px] md:p-[30px]'>
                {/* Title */}
                <div className='flex justify-between items-center w-full'>
                    <h1 className='text-[31.5px] md:text-[35px] text-white font-normal'>Gauge</h1>
                    <div className='flex justify-center items-center w-[62px] md:w-[72px] h-[62px] md:h-[72px] border border-solid border-[#808080] rounded-[15px] p-[10px]'>
                        <div className='flex justify-center items-center w-[40px] md:w-[50px] h-[40px] md:h-[50px]'>
                            <img src={solLogo} alt='sol-logo' className='w-full' />
                        </div>
                    </div>
                </div>

                {/* SOL */}
                <div className='flex items-center w-full mt-[3.5px] mb-[21px]'>
                    <div className='flex justify-center items-center h-[40px] mx-[7px]'>
                        <div className='text-[14px] bg-[rgba(84,245,183,.6)] border border-solid border-[rgba(84,245,183,.6)] rounded-[10px] p-[5px_10px]'>SOL</div>
                    </div>
                </div>

                {/* Vote description */}
                <div className='flex flex-col gap-[3.5px] w-full'>
                    <div>Vote with $SJWLSOL for $SOL delegation staking. 1 $SJWLSOL = 1 vote.</div>
                    <div className='flex flex-col'>
                        <div>Votes will determine the % of $SOL sent to the respective WL Validator/Staking Provider (SP).</div>
                        <div>- Delegation $SOL amount depends on Voting Power share %.</div>
                        <div>- Undelegate $SOL will be in the order of least voted SP, the second least voted SP, and so on.</div>
                    </div>
                    <div>Votes allocation will be adjusted every Thusday.</div>
                </div>

                {/* Votes allocation */}
                <div className='flex flex-col w-full mt-[42px]'>
                    <div className='text-[17.5px] font-normal'>Votes allocation (Current)</div>

                    {/* Votes Charts */}
                    <div className='grid grid-cols-12 mt-[21px]'>
                        {/* Chart labels */}
                        <div className='col-span-12 md:col-span-3 mt-[7px]'>
                            {
                                voteAllocations.map((item, index) => {
                                    return (
                                        <div
                                            key={index}
                                            className='flex items-center gap-[3.5px] mx-[14px]'>
                                            {/* Color */}
                                            <div
                                                className='w-[15px] h-[15px]'
                                                style={{ backgroundColor: item.color }}
                                            />
                                            {/* Validator name and vote score */}
                                            <div>{`${item.title} (${(item.value * 100).toFixed(4)}%)`}</div>
                                        </div>
                                    )
                                })
                            }
                        </div>

                        {/* Pie chart */}
                        <div className='col-span-12 md:col-span-6 mt-[7px]'>
                            <div className='relative w-full'>
                                {
                                    selectedIndex != undefined && voteAllocations.length > 0 && (
                                        <div className='absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-center items-center'>
                                            <div
                                                className='flex items-center gap-[3.5px] mt-[14px]'>
                                                <div
                                                    className='w-[15px] h-[15px]'
                                                    style={{ backgroundColor: voteAllocations[selectedIndex].color }}
                                                />
                                                <div>{voteAllocations[selectedIndex].title}</div>
                                            </div>

                                            <div className='text-[28px] font-medium my-[7px]'>{`${(voteAllocations[selectedIndex].value * 100).toFixed(4)}%`}</div>
                                        </div>
                                    )
                                }

                                <PieChart
                                    data={voteAllocations}
                                    className='mx-auto'
                                    radius={45}
                                    style={{
                                        fontSize: '6px',
                                        width: '300px',
                                        height: '300px',
                                        position: 'relative',
                                        zIndex: 10,
                                    }}
                                    lineWidth={20}
                                    segmentsStyle={{ transition: 'stroke .3s', cursor: 'pointer' }}
                                    segmentsShift={(index) => (index === selectedIndex ? 2 : 0)}
                                    animate
                                    onClick={(_, index) => {
                                        setSelectedIndex(index === selectedIndex ? undefined : index);
                                    }}
                                >
                                </PieChart>
                            </div>
                        </div>

                        {/* Total vote values */}
                        <div className='col-span-12 md:col-span-3 mt-[7px]'>
                            <div className='flex flex-col gap-[14px]'>
                                {/* TOTAL veJWLSOL VOTED */}
                                <div className='flex flex-col gap-[3.5px] w-full p-[20px_10px] border border-solid border-[#808080] rounded-[15px]'>
                                    <div className='text-[17px]'>TOTAL veJWLSOL VOTED</div>
                                    <div className='flex items-center gap-[7px]'>
                                        <div className='flex justify-center items-center w-[25px] h-[25px]'>
                                            <img src={vejwlsol} alt='vejwlsol' className='w-full' />
                                        </div>
                                        <div>{(totalVejwlsolVoted / LAMPORTS_PER_SOL).toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* veJWLSOL UNUSED */}
                                <div className='flex flex-col gap-[3.5px] w-full p-[20px_10px] border border-solid border-[#808080] rounded-[15px]'>
                                    <div className='text-[17px]'>veJWLSOL UNUSED</div>
                                    <div className='flex items-center gap-[7px]'>
                                        <div className='flex justify-center items-center w-[25px] h-[25px]'>
                                            <img src={vejwlsol} alt='vejwlsol' className='w-full' />
                                        </div>
                                        <div>{(vejwlsolUnused / LAMPORTS_PER_SOL).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Your vote */}
                <div className='flex flex-col w-full mt-[42px]'>
                    <div className='text-[17.5px] font-normal'>Your Votes</div>
                    <div className='mt-[7px]'>You can only change individual gauge votes once per 10 days. Make sure to do decreases first and increases last.</div>

                    {/* Vote table */}
                    <div className='flex flex-col w-full mt-[42px] mx-[-10.5px]'>
                        {/* Table header */}
                        <div className='grid grid-cols-12 py-[7px]'>
                            <div className='col-span-5 px-[10.5px]'>Name</div>
                            <div className='col-span-2 px-[10.5px]'>Voted</div>
                            <div className='col-span-5 px-[10.5px]'>Can vote</div>
                        </div>

                        {/* Table body */}
                        {
                            voteAllocations.map((item, index) => {
                                const totalAmount = vejwlsolAmount >= totalVotingPointForUser ? vejwlsolAmount : totalVotingPointForUser;
                                const canVote = vejwlsolAmount > 0 && Date.now() / 1000 > item.lastVotedAt + VOTE_COOLDOWN;

                                return (
                                    <div
                                        key={index}
                                        className={`grid grid-cols-12 ${index == selectedValidatorIndex ? 'border border-solid border-[#808080] bg-[#808080]' : 'border-b border-b-[#808080]'} ${canVote ? 'cursor-pointer' : 'cursor-default'} py-[10px]`}
                                        onClick={() => canVote && setSelectedValidatorIndex(index)}
                                    >
                                        <div className='col-span-5 px-[10.5px]'>{item.title}</div>
                                        <div className='col-span-2 px-[10.5px]'>{`${totalAmount > 0 ? (item.votingPoint / totalAmount * 100).toLocaleString() : 0}%`}</div>
                                        <div className='col-span-5 px-[10.5px] flex items-center gap-[5px]'>
                                            {
                                                canVote ? (
                                                    'Yes'
                                                ) : (
                                                    vejwlsolAmount == 0 ? (
                                                        <span className='text-[#808080]'>Zero Balance</span>
                                                    ) : (
                                                        <>
                                                            <HttpsOutlinedIcon className='text-[#808080]' />
                                                            <span className='text-[#808080]'>{`${new Date((item.lastVotedAt + VOTE_COOLDOWN) * 1000).toLocaleString()}`}</span>
                                                        </>
                                                    )
                                                )
                                            }
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>

                {/* Vote */}
                <div className='flex flex-col gap-[3.5px] mt-[21px]'>
                    <div className='text-[17.5px] font-normal'>Vote weight</div>

                    <div className='grid grid-cols-12 mx-[-10.5px]'>
                        {/* Slider */}
                        <div className='col-span-8 flex justify-center items-center px-[10.5px]'>
                            <Slider
                                valueLabelDisplay="auto"
                                aria-label="pretto slider"
                                min={0}
                                max={100}
                                step={0.01}
                                marks={sliderMarks}
                                value={Number(weight)}
                                valueLabelFormat={sliderValueLabelFormat}
                                onChange={(e: any) => handleSetWeight(e.target.value)}
                                sx={{
                                    color: '#54F5B7',
                                    height: 4,
                                    '& .MuiSlider-track': {
                                        border: 'none',
                                    },
                                    '& .MuiSlider-markLabel': {
                                        color: 'white',
                                        top: '30px'
                                    },
                                    '& .MuiSlider-thumb': {
                                        height: 15,
                                        width: 15,
                                        backgroundColor: 'currentColor',
                                        border: '2px solid currentColor',
                                        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                                            boxShadow: 'inherit',
                                        },
                                        '&:before': {
                                            display: 'none',
                                        },
                                    },
                                    '& .MuiSlider-valueLabel': {
                                        lineHeight: 1,
                                        fontSize: 10,
                                        background: 'unset',
                                        padding: 0,
                                        width: 35,
                                        height: 35,
                                        color: 'black',
                                        borderRadius: '50% 50% 50% 0',
                                        backgroundColor: '#54F5B7',
                                        transformOrigin: 'bottom left',
                                        transform: 'translate(50%, -100%) rotate(-45deg) scale(0)',
                                        '&:before': { display: 'none' },
                                        '&.MuiSlider-valueLabelOpen': {
                                            transform: 'translate(50%, -100%) rotate(-45deg) scale(1)',
                                        },
                                        '& > *': {
                                            transform: 'rotate(45deg)',
                                        },
                                    },
                                }}
                            />
                        </div>

                        {/* Weight value */}
                        <div className='col-span-4 md:col-span-2 flex justify-center items-center px-[10.5px]'>
                            <OutlinedInput
                                id="outlined-adornment-weight"
                                endAdornment={<InputAdornment position="end">%</InputAdornment>}
                                aria-describedby="outlined-weight-helper-text"
                                fullWidth
                                value={weight}
                                onChange={(e: any) => handleSetWeight(e.target.value)}
                                sx={{
                                    '& .MuiOutlinedInput-input': {
                                        textAlign: 'end',
                                        padding: '7px 0px'
                                    }
                                }}
                            />
                        </div>

                        {/* Vote button */}
                        <div className='col-span-12 md:col-span-2 flex justify-center items-center px-[10.5px]'>
                            <button
                                disabled={isVoting}
                                className='flex justify-center items-center w-full p-[7px_21px] rounded-[5px] btn-primary2'
                                onClick={handleVote}
                            >
                                {
                                    !isVoting ? (
                                        <span>Vote</span>
                                    ) : (
                                        <div className='flex justify-center items-center gap-[10px]'>
                                            <span className='text-white'>Voting...</span>
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

export default Gauge;