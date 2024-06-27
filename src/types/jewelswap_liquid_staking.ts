export type JewelswapLiquidStaking = {
    "version": "0.1.0",
    "name": "jewelswap_liquid_staking",
    "instructions": [
        {
            "name": "initialize",
            "docs": [
                "Initialize a global state - only sc owner can invoke"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "adminAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "botAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "jwlsolVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVaultAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sjwlsolMint",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "sjwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeWithdrawAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeDepositAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMetadataAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sjwlsolMetadataAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "splitStakeAccountsStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenMetadataProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "reserveVaultBump",
                    "type": "u8"
                },
                {
                    "name": "stakeWithdrawAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "stakeDepositAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "jwlsolAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "jwlsolVaultBump",
                    "type": "u8"
                },
                {
                    "name": "jwlsolVaultAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "sjwlsolAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "jwlsolName",
                    "type": "string"
                },
                {
                    "name": "jwlsolSymbol",
                    "type": "string"
                },
                {
                    "name": "jwlsolMetadataUri",
                    "type": "string"
                },
                {
                    "name": "sjwlsolName",
                    "type": "string"
                },
                {
                    "name": "sjwlsolSymbol",
                    "type": "string"
                },
                {
                    "name": "sjwlsolMetadataUri",
                    "type": "string"
                }
            ]
        },
        {
            "name": "addValidator",
            "docs": [
                "Add a validator - only admin"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorVoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "removeValidator",
            "docs": [
                "Remove a validator - only admin"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorVoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorStore",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "reserveClaim",
            "docs": [
                "Claim reward earned from native staking - only admin"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "claimRewards",
            "docs": [
                "Claim reward earned from native staking - only admin"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "fund",
            "docs": [
                "Fund to reserve vault - only admin"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "scoreValidator",
            "docs": [
                "Set score for a validator - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "checkRewards",
            "docs": [
                "Check rewards every epoch - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "epoch",
                    "type": "u64"
                },
                {
                    "name": "reward",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "stakeSolReserved",
            "docs": [
                "Stake sol reserved - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeAccount",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "stakeDepositAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorVoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeConfig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeHistory",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "splitStakeAccount",
            "docs": [
                "Split stake account - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "splitStakeAccountsStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "splitStakeAccount",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "stakeDepositAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorVoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeConfig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "mergeStakeAccount",
            "docs": [
                "Merge stake account - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sourceStakeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "destinationStakeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeDepositAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeConfig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeHistory",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "index",
                    "type": "u16"
                }
            ]
        },
        {
            "name": "deactivateStakeAccount",
            "docs": [
                "Deactivate stake account - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeDepositAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorVoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "splitStakeAccountsStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "index",
                    "type": "u16"
                }
            ]
        },
        {
            "name": "unstake",
            "docs": [
                "Unstake sol from staking account - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "splitStakeAccountsStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeWithdrawAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeHistory",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "index",
                    "type": "u16"
                }
            ]
        },
        {
            "name": "createWhirlpool",
            "docs": [
                "Create whirlpool - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenMintA",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenMintB",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultA",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "tokenVaultB",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "feeTier",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "whirlpool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "whirlpoolsConfig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "whirlpoolProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "bumps",
                    "type": {
                        "defined": "WhirlpoolBumps"
                    }
                },
                {
                    "name": "tickSpacing",
                    "type": "u16"
                },
                {
                    "name": "initialSqrtPrice",
                    "type": "u128"
                }
            ]
        },
        {
            "name": "openPosition",
            "docs": [
                "Open position - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "position",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "positionMint",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "positionMintOwner",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "positionTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "whirlpool",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "whirlpoolProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "associatedTokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "bumps",
                    "type": {
                        "defined": "OpenPositionBumps"
                    }
                },
                {
                    "name": "tickLowerIndex",
                    "type": "i32"
                },
                {
                    "name": "tickUpperIndex",
                    "type": "i32"
                }
            ]
        },
        {
            "name": "increaseLiquidity",
            "docs": [
                "Stake sol reserved - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "position",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "positionTokenAccount",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userWsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultA",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultB",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tickArrayLower",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tickArrayUpper",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "whirlpool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "whirlpoolProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "liquidityAmount",
                    "type": "u128"
                },
                {
                    "name": "tokenMaxA",
                    "type": "u64"
                },
                {
                    "name": "tokenMaxB",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "approveRedeem",
            "docs": [
                "Approve redeem reserved - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "runRedeem",
            "docs": [
                "Run redeem reserved - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userAddress",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "deposit",
            "docs": [
                "Deposit sol to reserve vault - user role"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "associatedTokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "stakeJwlsol",
            "docs": [
                "Stake jwlsol to jwlsol vault - user role"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sjwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sjwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userSjwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "associatedTokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "unstakeSjwlsol",
            "docs": [
                "Unstake jwlsol from jwlsol vault - user role"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVaultAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sjwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userSjwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "voteValidator",
            "docs": [
                "Vote validator - user role"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userToValidator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "votePercentage",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "reserveRedeem",
            "docs": [
                "Reserve redeem - user role"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        }
    ],
    "accounts": [
        {
            "name": "globalState",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "adminAccount",
                        "type": "publicKey"
                    },
                    {
                        "name": "botAccount",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwlsolMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwlsolAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwlsolAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "jwlsolVault",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwlsolVaultBump",
                        "type": "u8"
                    },
                    {
                        "name": "jwlsolVaultAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwlsolVaultAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "jwlsolReserve",
                        "type": "u64"
                    },
                    {
                        "name": "sjwlsolMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "sjwlsolAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "sjwlsolAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "sjwlsolReserve",
                        "type": "u64"
                    },
                    {
                        "name": "vejwlsolReserve",
                        "type": "u64"
                    },
                    {
                        "name": "reserveVault",
                        "type": "publicKey"
                    },
                    {
                        "name": "reserveVaultBump",
                        "type": "u8"
                    },
                    {
                        "name": "stakeWithdrawAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "stakeWithdrawAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "stakeDepositAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "stakeDepositAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "splitStakeAccountsStore",
                        "type": "publicKey"
                    },
                    {
                        "name": "whirlpool",
                        "type": "publicKey"
                    },
                    {
                        "name": "whirlpoolPosition",
                        "type": "publicKey"
                    },
                    {
                        "name": "whirlpoolPositionMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "whirlpoolPositionMintOwner",
                        "type": "publicKey"
                    },
                    {
                        "name": "whirlpoolPositionTokenAccount",
                        "type": "publicKey"
                    },
                    {
                        "name": "lastEpochCheckedRewards",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolToStake",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolToRedeem",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolAvailableToUnstake",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolToAddLiquidity",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolDelegated",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolToClaim",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolReservedToClaim",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolEarned",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "validator",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "voteAccount",
                        "type": "publicKey"
                    },
                    {
                        "name": "validatorStore",
                        "type": "publicKey"
                    },
                    {
                        "name": "votingScore",
                        "type": "u64"
                    },
                    {
                        "name": "currentScore",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "userToValidator",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "votingPoint",
                        "type": "u64"
                    },
                    {
                        "name": "lastVotedAt",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "userInfoAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "userAddress",
                        "type": "publicKey"
                    },
                    {
                        "name": "vejwlsolAmount",
                        "type": "u64"
                    },
                    {
                        "name": "votedVejwlsolAmount",
                        "type": "u64"
                    },
                    {
                        "name": "reservedRedeemAmount",
                        "type": "u64"
                    },
                    {
                        "name": "approvedRedeemAmount",
                        "type": "u64"
                    },
                    {
                        "name": "lastRedeemReservedEpoch",
                        "type": "u64"
                    },
                    {
                        "name": "lastRedeemApprovedEpoch",
                        "type": "u64"
                    },
                    {
                        "name": "isRedeemApproved",
                        "type": "bool"
                    }
                ]
            }
        },
        {
            "name": "validatorStore",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "stakeAccountCount",
                        "type": "u32"
                    },
                    {
                        "name": "stakeAccounts",
                        "type": {
                            "array": [
                                "publicKey",
                                100
                            ]
                        }
                    }
                ]
            }
        },
        {
            "name": "splitStakeAccountStore",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "splitStakeAccountCount",
                        "type": "u16"
                    },
                    {
                        "name": "splitStakeAccounts",
                        "type": {
                            "array": [
                                "publicKey",
                                3000
                            ]
                        }
                    }
                ]
            }
        }
    ],
    "types": [
        {
            "name": "WhirlpoolBumps",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "whirlpoolBump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "OpenPositionBumps",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "positionBump",
                        "type": "u8"
                    }
                ]
            }
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "Unauthorized",
            "msg": "Unauthorized singer"
        },
        {
            "code": 6001,
            "name": "ValidatorHasSolDelegated",
            "msg": "Validator has sol delegated"
        },
        {
            "code": 6002,
            "name": "InsufficientTokenBalance",
            "msg": "Insufficient token balance"
        },
        {
            "code": 6003,
            "name": "DuplicatedStakeAccount",
            "msg": "Duplicated stake account"
        },
        {
            "code": 6004,
            "name": "MismatchedStakeAccount",
            "msg": "Mismatched stake account"
        },
        {
            "code": 6005,
            "name": "InvalidStakeAccount",
            "msg": "Invalid stake account"
        },
        {
            "code": 6006,
            "name": "VoteCooldownNotOver",
            "msg": "Voting cooldown not over"
        },
        {
            "code": 6007,
            "name": "ZeroVeJwlsolAmount",
            "msg": "Zero vejwlsol amount"
        },
        {
            "code": 6008,
            "name": "ExceedVeJwlsolAmount",
            "msg": "Exceed vejwlsol amount"
        },
        {
            "code": 6009,
            "name": "InvalidAccountData",
            "msg": "An account's data contents was invalid"
        },
        {
            "code": 6010,
            "name": "InvalidEpoch",
            "msg": "Invalid epoch"
        },
        {
            "code": 6011,
            "name": "AlreadyApprovedRedeem",
            "msg": "Already approved redeem"
        },
        {
            "code": 6012,
            "name": "NotApprovedRedeem",
            "msg": "Not approved redeem"
        },
        {
            "code": 6013,
            "name": "NotTimeToRedeem",
            "msg": "Not time to redeem"
        },
        {
            "code": 6014,
            "name": "NotTimeToRunRedeem",
            "msg": "Not time to run redeem"
        },
        {
            "code": 6015,
            "name": "InsufficientReserveVaultBalance",
            "msg": "Insufficient reserve vault balance"
        },
        {
            "code": 6016,
            "name": "ZeroBalance",
            "msg": "Zero balance"
        },
        {
            "code": 6017,
            "name": "InsufficientSolToClaim",
            "msg": "Insufficient total sol to claim"
        },
        {
            "code": 6018,
            "name": "InsufficientSolReservedToClaim",
            "msg": "Insufficient total sol reserved to claim"
        },
        {
            "code": 6019,
            "name": "InsufficientSolAvailableToClaim",
            "msg": "Insufficient sol available to claim"
        },
        {
            "code": 6020,
            "name": "LowerThanMinDepositAmount",
            "msg": "Lower than min deposit amount"
        }
    ]
};

export const IDL: JewelswapLiquidStaking = {
    "version": "0.1.0",
    "name": "jewelswap_liquid_staking",
    "instructions": [
        {
            "name": "initialize",
            "docs": [
                "Initialize a global state - only sc owner can invoke"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "adminAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "botAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "jwlsolVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVaultAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sjwlsolMint",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "sjwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeWithdrawAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeDepositAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMetadataAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sjwlsolMetadataAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "splitStakeAccountsStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenMetadataProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "reserveVaultBump",
                    "type": "u8"
                },
                {
                    "name": "stakeWithdrawAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "stakeDepositAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "jwlsolAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "jwlsolVaultBump",
                    "type": "u8"
                },
                {
                    "name": "jwlsolVaultAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "sjwlsolAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "jwlsolName",
                    "type": "string"
                },
                {
                    "name": "jwlsolSymbol",
                    "type": "string"
                },
                {
                    "name": "jwlsolMetadataUri",
                    "type": "string"
                },
                {
                    "name": "sjwlsolName",
                    "type": "string"
                },
                {
                    "name": "sjwlsolSymbol",
                    "type": "string"
                },
                {
                    "name": "sjwlsolMetadataUri",
                    "type": "string"
                }
            ]
        },
        {
            "name": "addValidator",
            "docs": [
                "Add a validator - only admin"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorVoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "removeValidator",
            "docs": [
                "Remove a validator - only admin"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorVoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorStore",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "reserveClaim",
            "docs": [
                "Claim reward earned from native staking - only admin"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "claimRewards",
            "docs": [
                "Claim reward earned from native staking - only admin"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "fund",
            "docs": [
                "Fund to reserve vault - only admin"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "scoreValidator",
            "docs": [
                "Set score for a validator - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "checkRewards",
            "docs": [
                "Check rewards every epoch - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "epoch",
                    "type": "u64"
                },
                {
                    "name": "reward",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "stakeSolReserved",
            "docs": [
                "Stake sol reserved - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeAccount",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "stakeDepositAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorVoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeConfig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeHistory",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "splitStakeAccount",
            "docs": [
                "Split stake account - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "splitStakeAccountsStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "splitStakeAccount",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "stakeDepositAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorVoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeConfig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "mergeStakeAccount",
            "docs": [
                "Merge stake account - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sourceStakeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "destinationStakeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeDepositAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeConfig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeHistory",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "index",
                    "type": "u16"
                }
            ]
        },
        {
            "name": "deactivateStakeAccount",
            "docs": [
                "Deactivate stake account - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeDepositAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorVoteAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validatorStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "splitStakeAccountsStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "index",
                    "type": "u16"
                }
            ]
        },
        {
            "name": "unstake",
            "docs": [
                "Unstake sol from staking account - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "splitStakeAccountsStore",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeWithdrawAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "stakeProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stakeHistory",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "index",
                    "type": "u16"
                }
            ]
        },
        {
            "name": "createWhirlpool",
            "docs": [
                "Create whirlpool - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenMintA",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenMintB",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultA",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "tokenVaultB",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "feeTier",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "whirlpool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "whirlpoolsConfig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "whirlpoolProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "bumps",
                    "type": {
                        "defined": "WhirlpoolBumps"
                    }
                },
                {
                    "name": "tickSpacing",
                    "type": "u16"
                },
                {
                    "name": "initialSqrtPrice",
                    "type": "u128"
                }
            ]
        },
        {
            "name": "openPosition",
            "docs": [
                "Open position - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "position",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "positionMint",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "positionMintOwner",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "positionTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "whirlpool",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "whirlpoolProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "associatedTokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "bumps",
                    "type": {
                        "defined": "OpenPositionBumps"
                    }
                },
                {
                    "name": "tickLowerIndex",
                    "type": "i32"
                },
                {
                    "name": "tickUpperIndex",
                    "type": "i32"
                }
            ]
        },
        {
            "name": "increaseLiquidity",
            "docs": [
                "Stake sol reserved - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "position",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "positionTokenAccount",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userWsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultA",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultB",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tickArrayLower",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tickArrayUpper",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "whirlpool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "whirlpoolProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "liquidityAmount",
                    "type": "u128"
                },
                {
                    "name": "tokenMaxA",
                    "type": "u64"
                },
                {
                    "name": "tokenMaxB",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "approveRedeem",
            "docs": [
                "Approve redeem reserved - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "runRedeem",
            "docs": [
                "Run redeem reserved - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userAddress",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "deposit",
            "docs": [
                "Deposit sol to reserve vault - user role"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "reserveVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "associatedTokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "stakeJwlsol",
            "docs": [
                "Stake jwlsol to jwlsol vault - user role"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sjwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sjwlsolAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userSjwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "associatedTokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "unstakeSjwlsol",
            "docs": [
                "Unstake jwlsol from jwlsol vault - user role"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVaultAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "sjwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userSjwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "voteValidator",
            "docs": [
                "Vote validator - user role"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "validator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userToValidator",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "votePercentage",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "reserveRedeem",
            "docs": [
                "Reserve redeem - user role"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "userInfoAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwlsolVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwlsolAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "clock",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        }
    ],
    "accounts": [
        {
            "name": "globalState",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "adminAccount",
                        "type": "publicKey"
                    },
                    {
                        "name": "botAccount",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwlsolMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwlsolAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwlsolAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "jwlsolVault",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwlsolVaultBump",
                        "type": "u8"
                    },
                    {
                        "name": "jwlsolVaultAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwlsolVaultAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "jwlsolReserve",
                        "type": "u64"
                    },
                    {
                        "name": "sjwlsolMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "sjwlsolAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "sjwlsolAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "sjwlsolReserve",
                        "type": "u64"
                    },
                    {
                        "name": "vejwlsolReserve",
                        "type": "u64"
                    },
                    {
                        "name": "reserveVault",
                        "type": "publicKey"
                    },
                    {
                        "name": "reserveVaultBump",
                        "type": "u8"
                    },
                    {
                        "name": "stakeWithdrawAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "stakeWithdrawAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "stakeDepositAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "stakeDepositAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "splitStakeAccountsStore",
                        "type": "publicKey"
                    },
                    {
                        "name": "whirlpool",
                        "type": "publicKey"
                    },
                    {
                        "name": "whirlpoolPosition",
                        "type": "publicKey"
                    },
                    {
                        "name": "whirlpoolPositionMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "whirlpoolPositionMintOwner",
                        "type": "publicKey"
                    },
                    {
                        "name": "whirlpoolPositionTokenAccount",
                        "type": "publicKey"
                    },
                    {
                        "name": "lastEpochCheckedRewards",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolToStake",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolToRedeem",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolAvailableToUnstake",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolToAddLiquidity",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolDelegated",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolToClaim",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolReservedToClaim",
                        "type": "u64"
                    },
                    {
                        "name": "totalSolEarned",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "validator",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "voteAccount",
                        "type": "publicKey"
                    },
                    {
                        "name": "validatorStore",
                        "type": "publicKey"
                    },
                    {
                        "name": "votingScore",
                        "type": "u64"
                    },
                    {
                        "name": "currentScore",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "userToValidator",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "votingPoint",
                        "type": "u64"
                    },
                    {
                        "name": "lastVotedAt",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "userInfoAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "userAddress",
                        "type": "publicKey"
                    },
                    {
                        "name": "vejwlsolAmount",
                        "type": "u64"
                    },
                    {
                        "name": "votedVejwlsolAmount",
                        "type": "u64"
                    },
                    {
                        "name": "reservedRedeemAmount",
                        "type": "u64"
                    },
                    {
                        "name": "approvedRedeemAmount",
                        "type": "u64"
                    },
                    {
                        "name": "lastRedeemReservedEpoch",
                        "type": "u64"
                    },
                    {
                        "name": "lastRedeemApprovedEpoch",
                        "type": "u64"
                    },
                    {
                        "name": "isRedeemApproved",
                        "type": "bool"
                    }
                ]
            }
        },
        {
            "name": "validatorStore",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "stakeAccountCount",
                        "type": "u32"
                    },
                    {
                        "name": "stakeAccounts",
                        "type": {
                            "array": [
                                "publicKey",
                                100
                            ]
                        }
                    }
                ]
            }
        },
        {
            "name": "splitStakeAccountStore",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "splitStakeAccountCount",
                        "type": "u16"
                    },
                    {
                        "name": "splitStakeAccounts",
                        "type": {
                            "array": [
                                "publicKey",
                                3000
                            ]
                        }
                    }
                ]
            }
        }
    ],
    "types": [
        {
            "name": "WhirlpoolBumps",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "whirlpoolBump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "OpenPositionBumps",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "positionBump",
                        "type": "u8"
                    }
                ]
            }
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "Unauthorized",
            "msg": "Unauthorized singer"
        },
        {
            "code": 6001,
            "name": "ValidatorHasSolDelegated",
            "msg": "Validator has sol delegated"
        },
        {
            "code": 6002,
            "name": "InsufficientTokenBalance",
            "msg": "Insufficient token balance"
        },
        {
            "code": 6003,
            "name": "DuplicatedStakeAccount",
            "msg": "Duplicated stake account"
        },
        {
            "code": 6004,
            "name": "MismatchedStakeAccount",
            "msg": "Mismatched stake account"
        },
        {
            "code": 6005,
            "name": "InvalidStakeAccount",
            "msg": "Invalid stake account"
        },
        {
            "code": 6006,
            "name": "VoteCooldownNotOver",
            "msg": "Voting cooldown not over"
        },
        {
            "code": 6007,
            "name": "ZeroVeJwlsolAmount",
            "msg": "Zero vejwlsol amount"
        },
        {
            "code": 6008,
            "name": "ExceedVeJwlsolAmount",
            "msg": "Exceed vejwlsol amount"
        },
        {
            "code": 6009,
            "name": "InvalidAccountData",
            "msg": "An account's data contents was invalid"
        },
        {
            "code": 6010,
            "name": "InvalidEpoch",
            "msg": "Invalid epoch"
        },
        {
            "code": 6011,
            "name": "AlreadyApprovedRedeem",
            "msg": "Already approved redeem"
        },
        {
            "code": 6012,
            "name": "NotApprovedRedeem",
            "msg": "Not approved redeem"
        },
        {
            "code": 6013,
            "name": "NotTimeToRedeem",
            "msg": "Not time to redeem"
        },
        {
            "code": 6014,
            "name": "NotTimeToRunRedeem",
            "msg": "Not time to run redeem"
        },
        {
            "code": 6015,
            "name": "InsufficientReserveVaultBalance",
            "msg": "Insufficient reserve vault balance"
        },
        {
            "code": 6016,
            "name": "ZeroBalance",
            "msg": "Zero balance"
        },
        {
            "code": 6017,
            "name": "InsufficientSolToClaim",
            "msg": "Insufficient total sol to claim"
        },
        {
            "code": 6018,
            "name": "InsufficientSolReservedToClaim",
            "msg": "Insufficient total sol reserved to claim"
        },
        {
            "code": 6019,
            "name": "InsufficientSolAvailableToClaim",
            "msg": "Insufficient sol available to claim"
        },
        {
            "code": 6020,
            "name": "LowerThanMinDepositAmount",
            "msg": "Lower than min deposit amount"
        }
    ]
};
