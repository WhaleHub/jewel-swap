import { StellarService } from '../services/stellar.service';
import { storeAccountBalance, getAccountInfo } from '../lib/slices/userSlice';

/**
 * Utility function to refresh wallet balances with retry logic
 * @param userWalletAddress - The user's wallet address
 * @param dispatch - Redux dispatch function
 * @param retryCount - Number of retries (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 2000)
 */
export const refreshWalletBalances = async (
  userWalletAddress: string,
  dispatch: any,
  retryCount: number = 3,
  delayMs: number = 2000
): Promise<void> => {
  console.log("🔄 [helpers] Starting wallet balance refresh:", {
    userWalletAddress: userWalletAddress,
    addressLength: userWalletAddress?.length,
    isValidFormat: userWalletAddress ? /^G[A-Z0-9]{55}$/.test(userWalletAddress) : false,
    retryCount: retryCount,
    delayMs: delayMs,
    timestamp: new Date().toISOString()
  });
  
  // Validate wallet address before attempting any operations
  if (!userWalletAddress || userWalletAddress === 'null' || userWalletAddress === 'undefined' || userWalletAddress.trim() === '') {
    console.warn('❌ [helpers] Invalid wallet address provided to refreshWalletBalances:', {
      userWalletAddress: userWalletAddress,
      type: typeof userWalletAddress,
      length: userWalletAddress?.length
    });
    throw new Error('Invalid wallet address');
  }

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`🔄 [helpers] Balance refresh attempt ${attempt}/${retryCount}`, {
        userWalletAddress: userWalletAddress,
        attempt: attempt
      });
      
      const stellarService = new StellarService();
      const wrappedAccount = await stellarService.loadAccount(userWalletAddress);
      
      console.log("📦 [helpers] Account loaded, dispatching balance updates:", {
        balanceCount: wrappedAccount.balances?.length || 0,
        balances: wrappedAccount.balances?.map((b: any) => ({
          asset_code: b.asset_code || 'XLM',
          balance: b.balance
        }))
      });
      
      dispatch(storeAccountBalance(wrappedAccount.balances));
      dispatch(getAccountInfo(userWalletAddress));
      
      console.log(`✅ [helpers] Wallet balance refresh successful (attempt ${attempt})`);
      return; // Success, exit the function
      
    } catch (error) {
      console.error(`❌ [helpers] Balance refresh attempt ${attempt} failed:`, {
        attempt: attempt,
        totalAttempts: retryCount,
        userWalletAddress: userWalletAddress,
        error: error,
        errorMessage: (error as Error)?.message
      });
      
      if (attempt < retryCount) {
        console.log(`⏳ [helpers] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.error('⛔ [helpers] All balance refresh attempts failed');
        throw error;
      }
    }
  }
};

/**
 * Enhanced balance refresh with immediate and delayed checks
 * @param userWalletAddress - The user's wallet address
 * @param dispatch - Redux dispatch function
 * @param immediateDelay - Initial delay before first check (default: 1000ms)
 * @param secondaryDelay - Delay before secondary check (default: 3000ms)
 */
export const enhancedBalanceRefresh = async (
  userWalletAddress: string,
  dispatch: any,
  immediateDelay: number = 1000,
  secondaryDelay: number = 3000
): Promise<void> => {
  // Validate wallet address before attempting any operations
  if (!userWalletAddress || userWalletAddress === 'null' || userWalletAddress === 'undefined' || userWalletAddress.trim() === '') {
    console.warn('Invalid wallet address provided to enhancedBalanceRefresh:', userWalletAddress);
    return;
  }

  // Immediate refresh with short delay
  setTimeout(async () => {
    try {
      await refreshWalletBalances(userWalletAddress, dispatch, 2, 1500);
    } catch (error) {
      console.warn("Immediate balance refresh failed:", error);
    }
  }, immediateDelay);

  // Secondary refresh with longer delay for backend processing
  setTimeout(async () => {
    try {
      await refreshWalletBalances(userWalletAddress, dispatch, 2, 2000);
    } catch (error) {
      console.warn("Secondary balance refresh failed:", error);
    }
  }, secondaryDelay);
}; 