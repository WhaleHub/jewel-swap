// Soroban Configuration
export const SOROBAN_CONFIG = {
  // Contract IDs (Testnet)
  contracts: {
    staking: process.env.REACT_APP_STAKING_CONTRACT_ID || 'CCTOX3DR5EGTYSH3CH74YPHNBQ2BBYKQTUVV5NPPXJGGCAIF277BBHIX',
    governance: process.env.REACT_APP_GOVERNANCE_CONTRACT_ID || 'CASNQHCB75PEZU5BX2BZK3SN4WKE3UAPSJPM6WAR7DLPLDBUMZFUHOBA',
    rewards: process.env.REACT_APP_REWARDS_CONTRACT_ID || 'CDV5SQKDPAXMWNCX7ZQRW2W7JQ6JUKJ7PQJTLRWL6JLWVLZLVZ7LZLZ3',
    liquidity: process.env.REACT_APP_LIQUIDITY_CONTRACT_ID || 'CDV5SQKDPAXMWNCX7ZQRW2W7JQ6JUKJ7PQJTLRWL6JLWVLZLVZ7LZLZ4',
  },

  // Network Configuration
  network: {
    name: process.env.REACT_APP_STELLAR_NETWORK || 'testnet',
    rpcUrl: process.env.REACT_APP_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
    horizonUrl: process.env.REACT_APP_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  },

  // Backend API Configuration
  api: {
    baseUrl: process.env.REACT_APP_BACKEND_API_URL || 'http://localhost:3001',
    timeout: 30000,
  },

  // Feature Flags
  features: {
    useSoroban: process.env.REACT_APP_USE_SOROBAN === 'true' || true,
    enableContractSimulation: process.env.REACT_APP_ENABLE_CONTRACT_SIMULATION === 'true' || true,
    enableRealTimeSync: process.env.REACT_APP_ENABLE_REAL_TIME_SYNC === 'true' || true,
    debugMode: process.env.REACT_APP_DEBUG_MODE === 'true' || false,
  },

  // Transaction Configuration
  transaction: {
    defaultFee: '100000',
    timeout: 30,
    retryAttempts: 3,
    retryDelay: 2000,
  },

  // Sync Configuration
  sync: {
    interval: 10 * 60 * 1000, // 10 minutes
    retryAttempts: 3,
    retryDelay: 5000,
  },

  // Asset Configuration
  assets: {
    aqua: {
      code: 'AQUA',
      issuer: 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA',
    },
    blub: {
      code: 'BLUB',
      issuer: '', // To be set
    },
    ice: {
      code: 'ICE',
      issuer: '', // Issued by governance contract
    },
  },

  // Pool Configuration
  pools: {
    aquaBlub: {
      id: '1',
      assetA: 'AQUA',
      assetB: 'BLUB',
      feeRate: 0.003, // 0.3%
    },
  },

  // POL Configuration
  pol: {
    contributionPercentage: 0.1, // 10% of locked AQUA
    autoVotingEnabled: true,
    votingTarget: 'AQUA-BLUB', // ICE tokens automatically vote for AQUA-BLUB pair
  },

  // Governance Configuration
  governance: {
    maxLockDuration: 365, // days
    baseMultiplier: 1.0,
    maxMultiplier: 2.0,
    votingPowerMultiplier: 1.0,
  },
};

// Helper functions
export const getContractId = (contractType: keyof typeof SOROBAN_CONFIG.contracts): string => {
  return SOROBAN_CONFIG.contracts[contractType];
};

export const isFeatureEnabled = (feature: keyof typeof SOROBAN_CONFIG.features): boolean => {
  return SOROBAN_CONFIG.features[feature];
};

export const getAssetConfig = (assetCode: string) => {
  return Object.values(SOROBAN_CONFIG.assets).find(asset => asset.code === assetCode);
};

export const getPoolConfig = (poolId: string) => {
  return Object.values(SOROBAN_CONFIG.pools).find(pool => pool.id === poolId);
};

// Environment validation
export const validateEnvironment = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check required contract IDs
  if (!SOROBAN_CONFIG.contracts.staking) {
    errors.push('Staking contract ID is required');
  }
  
  if (!SOROBAN_CONFIG.contracts.governance) {
    errors.push('Governance contract ID is required');
  }
  
  // Check network configuration
  if (!SOROBAN_CONFIG.network.rpcUrl) {
    errors.push('Soroban RPC URL is required');
  }
  
  // Check backend API
  if (!SOROBAN_CONFIG.api.baseUrl) {
    errors.push('Backend API URL is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Log configuration on load
if (SOROBAN_CONFIG.features.debugMode) {
  console.log('🔧 [SorobanConfig] Configuration loaded:', SOROBAN_CONFIG);
  
  const validation = validateEnvironment();
  if (!validation.isValid) {
    console.warn('⚠️ [SorobanConfig] Configuration issues:', validation.errors);
  } else {
    console.log('✅ [SorobanConfig] Configuration validated successfully');
  }
} 