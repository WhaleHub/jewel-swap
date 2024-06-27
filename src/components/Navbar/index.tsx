import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { adminWallets } from '../../config';
import logo from '../../assets/images/logo.png';

const Navbar = () => {
    const wallet = useWallet();

    return (
        <nav className="fixed top-0 right-0 z-30 min-h-[81.5px] w-full bg-[#090C0E]/50 backdrop-blur-[9px] shadow-[0_2px_3px_rgba(0,0,0,.3)] py-[5px] transition-all duration-300">
            <div className='flex flex-col md:flex-row justify-center w-full h-full pt-[16px]'>
                <div className='flex flex-col md:flex-row justify-between items-center gap-[5px] md:gap-[14px] w-full max-w-[1320px] h-full px-[10.5px]'>
                    <a
                        href='https://jewelswap.io/'
                        target="_blank"
                        rel="noopener noreferrer"
                        className='flex justify-center items-center w-[160px] md:w-[200px]'
                    >
                        <img src={logo} className='w-full' alt='logo' />
                    </a>

                    <div className='flex justify-end items-center gap-[5.6px]'>
                        <div className='flex items-center gap-3'>
                            <Link to={'/stake/sol'} className='text-[14px] text-[#939da7] hover:text-white'>Stake</Link>
                            <Link to={'/gauge'} className='text-[14px] text-[#939da7] hover:text-white'>Gauge</Link>
                            {
                                wallet?.publicKey && adminWallets.includes(wallet?.publicKey?.toString()) && (
                                    <Link to={'/admin'} className='text-[14px] text-[#939da7] hover:text-white'>Admin</Link>
                                )
                            }
                        </div>

                        <div className='p-[7px]'>
                            {
                                wallet?.publicKey ? (
                                    <WalletMultiButton className='btn-primary2 !h-[40px] after:bg-[rgba(84,245,183,.6)]'>
                                        {`${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`}
                                    </WalletMultiButton>
                                ) : (
                                    <WalletMultiButton className='btn-primary2 !h-[40px] after:bg-[rgba(84,245,183,.6)]'>Connect</WalletMultiButton>
                                )
                            }
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;