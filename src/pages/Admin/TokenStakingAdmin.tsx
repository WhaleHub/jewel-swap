import React, { useEffect, useState } from 'react';
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
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { TOKEN_METADATA_PROGRAM_ID } from '../../config';
import { IToken } from '../../interfaces';
import { getTokenSymbolFromTokenMint, useContractInteractor } from '../../utils';

const TokenStakingAdmin = () => {
    const wallet = useWallet();
    const { tokenStakingProgram: program } = useContractInteractor();
    const [tokens, setTokens] = useState<IToken[]>([]);
    const [stakingPercentage, setStakingPercentage] = useState<number>(0);
    const [tokenSymbol, setTokenSymbol] = useState<string>('');
    const [tokenMint, setTokenMint] = useState<string>('');
    const [jwltokenMetadataUri, setJwltokenMetadataUri] = useState<string>('');
    const [isRegisteringToken, setIsRegisteringToken] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const initialize = async (isInit?: boolean) => {
        if (isInit) {
            setIsLoading(true);
        }

        try {
            const [tokenInfos] = await Promise.all([
                program.account.tokenInfo.all(),
            ]);

            console.log({ tokenInfos });
            setTokens(tokenInfos);
        } catch (e) {
            console.log('e', e);
        }

        setIsLoading(false);
    }

    const handleRegisterToken = async () => {
        try {
            if (!wallet?.publicKey) {
                return toast.warn('Please connect wallet');
            }

            if (!tokenSymbol) {
                return toast.warn('Please input token symbol');
            }

            if (!tokenMint) {
                return toast.warn('Please input token mint address');
            }

            if (!jwltokenMetadataUri) {
                return toast.warn('Please input jwltoken metadata uri');
            }

            setIsProcessing(true);
            setIsRegisteringToken(true);

            const tokenMintPubkey = new PublicKey(tokenMint);
            const jwltokenMintKeypair = Keypair.generate();
            const jwltokenMint = jwltokenMintKeypair.publicKey;

            const globalStatePubkey = PublicKey.findProgramAddressSync(
                [Buffer.from('global-state')],
                program.programId
            )[0];

            const tokenAuthority = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-authority'),
                    globalStatePubkey.toBuffer(),
                ],
                program.programId
            )[0];

            const tokenVaultAuthority = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-vault-authority'),
                    globalStatePubkey.toBuffer(),
                ],
                program.programId
            )[0];

            const tokenInfo = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-info'),
                    tokenMintPubkey.toBuffer(),
                ],
                program.programId
            )[0];

            const [tokenVault, tokenVaultBump] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-vault'),
                    tokenMintPubkey.toBuffer(),
                ],
                program.programId
            );

            const [jwltokenVault, jwltokenVaultBump] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('token-vault'),
                    jwltokenMint.toBuffer(),
                ],
                program.programId
            );

            const jwltokenMetadataAccount = anchor.web3.PublicKey.findProgramAddressSync(
                [
                    Buffer.from("metadata"),
                    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                    jwltokenMint.toBuffer(),
                ],
                TOKEN_METADATA_PROGRAM_ID
            )[0];

            const txh = await program.methods
                .registerToken(
                    new anchor.BN(stakingPercentage),
                    tokenVaultBump,
                    jwltokenVaultBump,
                    `JWL${tokenSymbol.toUpperCase()}`,
                    `JWL${tokenSymbol.toUpperCase()}`,
                    jwltokenMetadataUri,
                )
                .accounts({
                    signer: wallet.publicKey,
                    globalState: globalStatePubkey,
                    tokenMint: tokenMint,
                    tokenInfo: tokenInfo,
                    tokenVault: tokenVault,
                    jwltokenMint: jwltokenMint,
                    jwltokenVault: jwltokenVault,
                    tokenAuthority: tokenAuthority,
                    tokenVaultAuthority: tokenVaultAuthority,
                    jwltokenMetadataAccount: jwltokenMetadataAccount,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                })
                .signers([jwltokenMintKeypair])
                .rpc();

            console.log('txh: ', txh);

            await initialize();
            toast.success('Successful to register a new token');
        } catch (e) {
            console.log({ e });
            toast.error('Failed to register a new token');
        }

        setIsProcessing(false);
        setIsRegisteringToken(false);
    }

    useEffect(() => {
        (async () => {
            await initialize(true);
        })();
    }, [wallet?.publicKey]);

    return (

        <div className='flex flex-col items-center gap-[30px] w-full'>
            <h1 className='text-[42px]'>Manage Token Staking</h1>

            {/* Manage tokens */}
            <div className='flex flex-col items-center w-full max-w-[650px]'>
                <h1 className='w-full text-[32px] text-center'>Manage tokens</h1>

                {/* Register token */}
                <div className='flex flex-col gap-[20px] mt-[20px] w-full'>
                    <h3 className='text-[18px]'>Register token</h3>

                    <div className='flex flex-col w-full gap-[10px]'>
                        {/* Token Symbol */}
                        <div className='flex justify-center items-center gap-[10px]'>
                            <div className='flex-none w-[165px]'>Token Symbol:</div>

                            <OutlinedInput
                                id='token-symbol'
                                aria-describedby='token-symbol-text'
                                fullWidth
                                className='grow'
                                placeholder='Token Symbol'
                                value={tokenSymbol}
                                sx={{
                                    '& .MuiOutlinedInput-input': {
                                        padding: '7px 10px'
                                    }
                                }}
                                onChange={(e) => setTokenSymbol(e.target.value)}
                            />
                        </div>

                        {/* Token mint */}
                        <div className='flex justify-center items-center gap-[10px]'>
                            <div className='flex-none w-[165px]'>Token Mint:</div>

                            <OutlinedInput
                                id='token-mint'
                                aria-describedby='token-mint-text'
                                fullWidth
                                className='grow'
                                placeholder='Token Mint Address'
                                value={tokenMint}
                                sx={{
                                    '& .MuiOutlinedInput-input': {
                                        padding: '7px 10px'
                                    }
                                }}
                                onChange={(e) => setTokenMint(e.target.value)}
                            />
                        </div>


                        {/* JWLToken metadata uri */}
                        <div className='flex justify-center items-center gap-[10px]'>
                            <div className='flex-none w-[165px]'>JWLToken MetadataUri:</div>

                            <OutlinedInput
                                id='jwltoken-metadata-uri'
                                aria-describedby='jwltoken-metadata-uri-text'
                                fullWidth
                                className='grow'
                                placeholder='Metadata Uri'
                                value={jwltokenMetadataUri}
                                sx={{
                                    '& .MuiOutlinedInput-input': {
                                        padding: '7px 10px'
                                    }
                                }}
                                onChange={(e) => setJwltokenMetadataUri(e.target.value)}
                            />
                        </div>

                        {/* Register button */}
                        <div className='flex justify-end items-center'>
                            <button
                                disabled={isProcessing || isRegisteringToken}
                                className='flex justify-center items-center min-w-[120px] p-[7px_21px] rounded-[5px] btn-primary2'
                                onClick={handleRegisterToken}
                            >
                                {
                                    !isRegisteringToken ? (
                                        <span>Register</span>
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

                {/* Tokens registered */}
                <div className='flex flex-col mt-[30px] w-full'>
                    <h3 className='text-[18px]'>Tokens registerd</h3>

                    {
                        !isLoading ? (
                            tokens.length > 0 ? (
                                <TableContainer>
                                    <Table sx={{ width: '100%' }} aria-label="simple table">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>TokenMint</TableCell>
                                                <TableCell>TokenSymbol</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {tokens.map((row, index) => (
                                                <TableRow
                                                    key={index}
                                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                >
                                                    <TableCell component="th" scope="row">
                                                        {row.account.tokenMint.toString()}
                                                    </TableCell>
                                                    <TableCell component="th" scope="row">
                                                        {getTokenSymbolFromTokenMint(row.account.tokenMint)}
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
        </div>
    );
};

export default TokenStakingAdmin;