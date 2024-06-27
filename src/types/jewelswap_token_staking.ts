export type JewelswapTokenStaking = {
    "version": "0.1.0",
    "name": "jewelswap_token_staking",
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
                    "name": "tokenAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultAuthority",
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
                    "name": "tokenAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "tokenVaultAuthorityBump",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "registerToken",
            "docs": [
                "Register token - only admin"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMetadataAccount",
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
                    "name": "stakingPercentage",
                    "type": "u64"
                },
                {
                    "name": "tokenVaultBump",
                    "type": "u8"
                },
                {
                    "name": "jwltokenVaultBump",
                    "type": "u8"
                },
                {
                    "name": "jwltokenName",
                    "type": "string"
                },
                {
                    "name": "jwltokenSymbol",
                    "type": "string"
                },
                {
                    "name": "jwltokenMetadataUri",
                    "type": "string"
                }
            ]
        },
        {
            "name": "addEpochRewards",
            "docs": [
                "Add epoch rewards - only admin"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
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
                    "name": "tokenInfo",
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
                    "name": "tokenInfo",
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultAuthority",
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
                    "name": "tokenAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
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
            "name": "distributeRewards",
            "docs": [
                "Distribute rewards - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenInfo",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "triggerEpoch",
            "docs": [
                "Trigger epoch - only bot"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "convert",
            "docs": [
                "Convert - user role"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenInfo",
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
                },
                {
                    "name": "isStaking",
                    "type": "bool"
                }
            ]
        },
        {
            "name": "stakeJwltoken",
            "docs": [
                "Stake jwltoken - user role"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenInfo",
                    "isMut": true,
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
            "name": "unstakeJwltoken",
            "docs": [
                "Unstake jwltoken - user role"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenInfo",
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
            "name": "claimRewards",
            "docs": [
                "Claim rewards - user role"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenInfo",
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
                        "name": "tokenAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "tokenVaultAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenVaultAuthorityBump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "tokenInfo",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "tokenMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenVault",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenVaultBump",
                        "type": "u8"
                    },
                    {
                        "name": "jwltokenMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwltokenVault",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwltokenVaultBump",
                        "type": "u8"
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
                        "name": "stakingPercentage",
                        "type": "u64"
                    },
                    {
                        "name": "tokenToStake",
                        "type": "u64"
                    },
                    {
                        "name": "tokenToAddLiquidity",
                        "type": "u64"
                    },
                    {
                        "name": "totalJwltokenStaked",
                        "type": "u64"
                    },
                    {
                        "name": "totalJwltokenCompounded",
                        "type": "u64"
                    },
                    {
                        "name": "totalStakers",
                        "type": "u64"
                    },
                    {
                        "name": "totalStakersChecked",
                        "type": "u64"
                    },
                    {
                        "name": "currentEpoch",
                        "type": "u64"
                    },
                    {
                        "name": "epochRewards",
                        "type": "u64"
                    },
                    {
                        "name": "epochStartTime",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "userJwltokenInfo",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "userAddress",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwltokenMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwltokenStaked",
                        "type": "u64"
                    },
                    {
                        "name": "totalRewards",
                        "type": "u64"
                    },
                    {
                        "name": "lastStakedAt",
                        "type": "u64"
                    },
                    {
                        "name": "lastEpochChecked",
                        "type": "u64"
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
            "name": "InvalidValue",
            "msg": "Invalid value"
        },
        {
            "code": 6002,
            "name": "EpochIsOver",
            "msg": "Epoch period is over"
        },
        {
            "code": 6003,
            "name": "EpochIsNotOver",
            "msg": "Epoch period is not over"
        },
        {
            "code": 6004,
            "name": "CooldownIsNotOver",
            "msg": "Cooldown is not over"
        },
        {
            "code": 6005,
            "name": "NotTimeToTriggerEpoch",
            "msg": "Not time to trigger epoch"
        },
        {
            "code": 6006,
            "name": "AlreadyGotRewards",
            "msg": "Already got rewards"
        },
        {
            "code": 6007,
            "name": "AlreadyDoneDistribution",
            "msg": "Already done distribution"
        },
        {
            "code": 6008,
            "name": "InsufficientRewards",
            "msg": "Insufficient rewards"
        },
        {
            "code": 6009,
            "name": "InsufficientBalance",
            "msg": "Insufficient balance"
        }
    ]
};

export const IDL: JewelswapTokenStaking = {
    "version": "0.1.0",
    "name": "jewelswap_token_staking",
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
                    "name": "tokenAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultAuthority",
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
                    "name": "tokenAuthorityBump",
                    "type": "u8"
                },
                {
                    "name": "tokenVaultAuthorityBump",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "registerToken",
            "docs": [
                "Register token - only admin"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMetadataAccount",
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
                    "name": "stakingPercentage",
                    "type": "u64"
                },
                {
                    "name": "tokenVaultBump",
                    "type": "u8"
                },
                {
                    "name": "jwltokenVaultBump",
                    "type": "u8"
                },
                {
                    "name": "jwltokenName",
                    "type": "string"
                },
                {
                    "name": "jwltokenSymbol",
                    "type": "string"
                },
                {
                    "name": "jwltokenMetadataUri",
                    "type": "string"
                }
            ]
        },
        {
            "name": "addEpochRewards",
            "docs": [
                "Add epoch rewards - only admin"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
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
                    "name": "tokenInfo",
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
                    "name": "tokenInfo",
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultAuthority",
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
                    "name": "tokenAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
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
            "name": "distributeRewards",
            "docs": [
                "Distribute rewards - only bot"
            ],
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "globalState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenInfo",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "triggerEpoch",
            "docs": [
                "Trigger epoch - only bot"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "convert",
            "docs": [
                "Convert - user role"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenInfo",
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
                },
                {
                    "name": "isStaking",
                    "type": "bool"
                }
            ]
        },
        {
            "name": "stakeJwltoken",
            "docs": [
                "Stake jwltoken - user role"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenInfo",
                    "isMut": true,
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
            "name": "unstakeJwltoken",
            "docs": [
                "Unstake jwltoken - user role"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenInfo",
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
            "name": "claimRewards",
            "docs": [
                "Claim rewards - user role"
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
                    "name": "tokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "jwltokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenInfo",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVaultAuthority",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userJwltokenInfo",
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
                        "name": "tokenAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenAuthorityBump",
                        "type": "u8"
                    },
                    {
                        "name": "tokenVaultAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenVaultAuthorityBump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "tokenInfo",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "tokenMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenVault",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenVaultBump",
                        "type": "u8"
                    },
                    {
                        "name": "jwltokenMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwltokenVault",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwltokenVaultBump",
                        "type": "u8"
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
                        "name": "stakingPercentage",
                        "type": "u64"
                    },
                    {
                        "name": "tokenToStake",
                        "type": "u64"
                    },
                    {
                        "name": "tokenToAddLiquidity",
                        "type": "u64"
                    },
                    {
                        "name": "totalJwltokenStaked",
                        "type": "u64"
                    },
                    {
                        "name": "totalJwltokenCompounded",
                        "type": "u64"
                    },
                    {
                        "name": "totalStakers",
                        "type": "u64"
                    },
                    {
                        "name": "totalStakersChecked",
                        "type": "u64"
                    },
                    {
                        "name": "currentEpoch",
                        "type": "u64"
                    },
                    {
                        "name": "epochRewards",
                        "type": "u64"
                    },
                    {
                        "name": "epochStartTime",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "userJwltokenInfo",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "userAddress",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwltokenMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "jwltokenStaked",
                        "type": "u64"
                    },
                    {
                        "name": "totalRewards",
                        "type": "u64"
                    },
                    {
                        "name": "lastStakedAt",
                        "type": "u64"
                    },
                    {
                        "name": "lastEpochChecked",
                        "type": "u64"
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
            "name": "InvalidValue",
            "msg": "Invalid value"
        },
        {
            "code": 6002,
            "name": "EpochIsOver",
            "msg": "Epoch period is over"
        },
        {
            "code": 6003,
            "name": "EpochIsNotOver",
            "msg": "Epoch period is not over"
        },
        {
            "code": 6004,
            "name": "CooldownIsNotOver",
            "msg": "Cooldown is not over"
        },
        {
            "code": 6005,
            "name": "NotTimeToTriggerEpoch",
            "msg": "Not time to trigger epoch"
        },
        {
            "code": 6006,
            "name": "AlreadyGotRewards",
            "msg": "Already got rewards"
        },
        {
            "code": 6007,
            "name": "AlreadyDoneDistribution",
            "msg": "Already done distribution"
        },
        {
            "code": 6008,
            "name": "InsufficientRewards",
            "msg": "Insufficient rewards"
        },
        {
            "code": 6009,
            "name": "InsufficientBalance",
            "msg": "Insufficient balance"
        }
    ]
};
