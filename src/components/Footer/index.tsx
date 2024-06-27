import React from 'react';
import { Link } from 'react-router-dom';
import TwitterIcon from '../../svgs/TwitterIcon';
import { FaTelegramPlane } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className='flex justify-center items-center w-full mt-[100px] mb-[20px]'>
            <div className='flex flex-col md:flex-row justify-between items-center gap-[7px] w-full max-w-[1320px] px-[10.5px] md:px-0'>
                <div className='flex items-center gap-[7px]'>
                    <Link to={'/stake'} className='text-[14px] text-[#939da7]'>Stake</Link>
                    <Link to={'/gauge'} className='text-[14px] text-[#939da7]'>Gauge</Link>
                    <Link to={'/admin'} className='text-[14px] text-[#939da7]'>Admin</Link>
                </div>

                <div className='flex items-start gap-3 text-[21px]'>
                    <a
                        href='https://twitter.com/JewelSwapX'
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <TwitterIcon />
                    </a>

                    <a
                        href='https://t.me/jewelswap'
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FaTelegramPlane />
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;