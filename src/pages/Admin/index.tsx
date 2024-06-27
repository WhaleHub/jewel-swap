import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { adminWallets } from '../../config';
import LiquidStakingAdmin from './LiquidStakingAdmin';
import TokenStakingAdmin from './TokenStakingAdmin';

const Admin = () => {
    const wallet = useWallet();
    const navigate = useNavigate();

    useEffect(() => {
        if (wallet?.publicKey) {
            if (!adminWallets.includes(wallet.publicKey.toString())) {
                navigate('/');
            }
        }
    }, [wallet?.publicKey]);

    return (
        <div className='flex flex-col items-center gap-[60px] w-full mt-[56px] md:mt-[40px] px-[10px]'>
            {
                wallet?.publicKey && adminWallets.includes(wallet?.publicKey.toString()) && (
                    <>
                        <LiquidStakingAdmin />
                        <TokenStakingAdmin />
                    </>
                )
            }
        </div>
    );
};

export default Admin;