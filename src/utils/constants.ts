// Helper function to get required environment variable
const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `❌ [Constants] Missing required environment variable: ${key}. Please set it in your .env file.`
    );
  }
  return value;
};

// Network RPC Endpoint
export const sorobanMainnetRpcEndpoint: string = getRequiredEnv(
  "REACT_APP_SOROBAN_RPC_URL"
);

// Admin Configuration
export const blubIssuerPublicKey: string = getRequiredEnv(
  "REACT_APP_ADMIN_ADDRESS"
);
export const blubSignerPublicKey: string = getRequiredEnv(
  "REACT_APP_ADMIN_ADDRESS"
);
export const lpSignerPublicKey: string = getRequiredEnv(
  "REACT_APP_ADMIN_ADDRESS"
);
export const treasureAddress: string = getRequiredEnv(
  "REACT_APP_ADMIN_ADDRESS"
);

// Backend API
export const BACKEND_API = getRequiredEnv("REACT_APP_BACKEND_URL");

// AQUA Asset Configuration
export const aquaAssetCode = "AQUA";
export const aquaAssetIssuer = getRequiredEnv("REACT_APP_AQUA_ISSUER");

export const blubAssetCode = "BLUB";
export const blubIssuer =
  "GCYITYIOHQIDYK5ASX5CC7LVC4WOTHMCMPNDCTPARUUFHYDV2EBX55IQ";

export const usdcAssetCode = "USDC";
export const usdcIssuer =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
export const XlmAssetCode = "XLM";
