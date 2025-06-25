import { Fragment, ReactNode, useEffect } from "react";
import {
  allowAllModules,
  FREIGHTER_ID,
  FreighterModule,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { StellarService } from "../services/stellar.service";
import { useAppDispatch } from "../lib/hooks";
import {
  fetchingWalletInfo,
  getAccountInfo,
  getLockedAquaRewardsForAccount,
  setUserbalances,
  setUserWalletAddress,
  setWalletConnected,
  setWalletConnectName,
  storeAccountBalance,
} from "../lib/slices/userSlice";
import { useSelector } from "react-redux";
import { RootState } from "../lib/store";
import { walletTypes } from "../enums";
import { getPublicKey, signTransaction } from "@lobstrco/signer-extension-api";
import { getAppData } from "../lib/slices/appSlice";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { aquaAssetCode, aquaAssetIssuer } from "../utils/constants";

interface MainProviderProps {
  children: ReactNode;
}

function MainProvider({ children }: MainProviderProps): JSX.Element {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);

  const getWalletInfo = async () => {
    console.log("🏁 [MainProvider] Starting getWalletInfo - Current user state:", {
      walletName: user?.walletName,
      userWalletAddress: user?.userWalletAddress,
      walletConnected: user?.walletConnected,
      fetchingWalletInfo: user?.fetchingWalletInfo
    });
    
    if (!user?.walletName) {
      console.warn("⚠️ [MainProvider] No wallet name found, skipping wallet info fetch");
      return;
    }
    
    // Add retry counter to prevent infinite loops
    const maxRetries = 3;
    const currentRetries = (getWalletInfo as any).retryCount || 0;
    
    console.log(`🔄 [MainProvider] Wallet info fetch attempt ${currentRetries + 1}/${maxRetries}`);
    
    const stellarService = new StellarService();

    try {
      if (user?.walletName === walletTypes.FREIGHTER) {
        console.log("🌌 [MainProvider] Processing FREIGHTER wallet");
        
        const kit: StellarWalletsKit = new StellarWalletsKit({
          network: WalletNetwork.PUBLIC,
          selectedWalletId: FREIGHTER_ID,
          modules: [new FreighterModule()],
        });
        const { address } = await kit.getAddress();
        
        console.log("📍 [MainProvider] Freighter address retrieved:", {
          address: address,
          addressLength: address?.length,
          isValidFormat: address ? /^G[A-Z0-9]{55}$/.test(address) : false
        });
        
        // Validate address before making API call
        if (!address || address === 'null' || address === 'undefined') {
          console.warn("❌ [MainProvider] Invalid address from Freighter wallet:", address);
          dispatch(fetchingWalletInfo(false));
          return;
        }
        
        const wrappedAccount = await stellarService.loadAccount(address);
        
        console.log("💰 [MainProvider] Freighter account balances loaded:", {
          totalBalances: wrappedAccount.balances?.length || 0,
          balanceDetails: wrappedAccount.balances?.map((b: any) => ({
            asset_type: b.asset_type,
            asset_code: b.asset_code || 'XLM',
            balance: b.balance,
            limit: b.limit
          }))
        });

        dispatch(getAppData());
        dispatch(setUserbalances(wrappedAccount.balances));
        dispatch(getAccountInfo(address));
        dispatch(fetchingWalletInfo(false));
        
        // Reset retry counter on success
        (getWalletInfo as any).retryCount = 0;
        
      } else if (user?.walletName === walletTypes.LOBSTR) {
        console.log("🦞 [MainProvider] Processing LOBSTR wallet");
        
        // Validate user wallet address before proceeding
        if (!user.userWalletAddress || user.userWalletAddress === 'null' || user.userWalletAddress === 'undefined') {
          console.warn("❌ [MainProvider] Invalid user wallet address for LOBSTR:", {
            userWalletAddress: user.userWalletAddress,
            addressLength: user.userWalletAddress?.length,
            isValidFormat: user.userWalletAddress ? /^G[A-Z0-9]{55}$/.test(user.userWalletAddress) : false
          });
          dispatch(fetchingWalletInfo(false));
          return;
        }
        
        const address = user.userWalletAddress;
        console.log("📍 [MainProvider] Using LOBSTR address:", {
          address: address,
          addressLength: address?.length,
          isValidFormat: /^G[A-Z0-9]{55}$/.test(address)
        });
        
        const wrappedAccount = await stellarService.loadAccount(address);

        console.log("💰 [MainProvider] LOBSTR account balances loaded:", {
          totalBalances: wrappedAccount.balances?.length || 0,
          balanceDetails: wrappedAccount.balances?.map((b: any) => ({
            asset_type: b.asset_type,
            asset_code: b.asset_code || 'XLM',
            balance: b.balance,
            limit: b.limit
          }))
        });

        dispatch(getAppData());
        dispatch(setUserbalances(wrappedAccount.balances));
        dispatch(getAccountInfo(address));
        dispatch(fetchingWalletInfo(false));
        dispatch(getLockedAquaRewardsForAccount(address));
        
        // Reset retry counter on success
        (getWalletInfo as any).retryCount = 0;
      } else if (user?.walletName === walletTypes.WALLETCONNECT) {
        console.log("🔗 [MainProvider] Processing WALLETCONNECT wallet");
        
        if (!user.userWalletAddress || user.userWalletAddress === 'null' || user.userWalletAddress === 'undefined') {
          console.warn("❌ [MainProvider] Invalid user wallet address for WALLETCONNECT:", {
            userWalletAddress: user.userWalletAddress,
            addressLength: user.userWalletAddress?.length,
            isValidFormat: user.userWalletAddress ? /^G[A-Z0-9]{55}$/.test(user.userWalletAddress) : false
          });
          dispatch(fetchingWalletInfo(false));
          return;
        }
        
        const address = user.userWalletAddress;
        console.log("📍 [MainProvider] Using WALLETCONNECT address:", {
          address: address,
          addressLength: address?.length,
          isValidFormat: /^G[A-Z0-9]{55}$/.test(address)
        });
        
        const wrappedAccount = await stellarService.loadAccount(address);

        console.log("💰 [MainProvider] WALLETCONNECT account balances loaded:", {
          totalBalances: wrappedAccount.balances?.length || 0,
          balanceDetails: wrappedAccount.balances?.map((b: any) => ({
            asset_type: b.asset_type,
            asset_code: b.asset_code || 'XLM',
            balance: b.balance,
            limit: b.limit
          }))
        });

        dispatch(getAppData());
        dispatch(setUserbalances(wrappedAccount.balances));
        dispatch(getAccountInfo(address));
        dispatch(fetchingWalletInfo(false));
        dispatch(getLockedAquaRewardsForAccount(address));
        
        // Reset retry counter on success
        (getWalletInfo as any).retryCount = 0;
      }
      
      console.log("✅ [MainProvider] Wallet info fetched successfully");
      
    } catch (error) {
      console.error("❌ [MainProvider] Error fetching wallet info:", {
        error: error,
        errorMessage: (error as Error)?.message,
        walletName: user?.walletName,
        userWalletAddress: user?.userWalletAddress,
        attempt: currentRetries + 1
      });
      dispatch(fetchingWalletInfo(false));
      
      // Only retry if we haven't exceeded max retries and have valid wallet info
      if (currentRetries < maxRetries && user?.walletName && 
          (user?.walletName === walletTypes.FREIGHTER || 
           (user?.walletName === walletTypes.LOBSTR && user?.userWalletAddress && user.userWalletAddress !== 'null') ||
           (user?.walletName === walletTypes.WALLETCONNECT && user?.userWalletAddress && user.userWalletAddress !== 'null'))) {
        
        (getWalletInfo as any).retryCount = currentRetries + 1;
        console.log(`🔄 [MainProvider] Retrying wallet info fetch... (${currentRetries + 1}/${maxRetries})`);
        
        setTimeout(() => {
          getWalletInfo();
        }, 2000);
      } else {
        console.warn("⛔ [MainProvider] Max retries reached or invalid wallet info, stopping retry attempts");
        (getWalletInfo as any).retryCount = 0;
      }
    }
  };

  // Enhanced wallet refresh function for manual refresh
  const refreshWalletInfo = async () => {
    if (!user?.walletName || !user?.userWalletAddress) return;
    
    try {
      const stellarService = new StellarService();
      const wrappedAccount = await stellarService.loadAccount(user.userWalletAddress);
      
      dispatch(setUserbalances(wrappedAccount.balances));
      dispatch(getAccountInfo(user.userWalletAddress));
      
      console.log("Wallet info refreshed successfully");
    } catch (error) {
      console.error("Error refreshing wallet info:", error);
    }
  };

  const getRewards = async () => {
    const address = user?.userRecords?.account?.account;
    if (address) getLockedAquaRewardsForAccount(address);
  };

  const getAddress = async () => {
    try {
      if (walletTypes.FREIGHTER === user?.walletName) {
        if (user?.userWalletAddress) return; // Already have address
        const kit: StellarWalletsKit = new StellarWalletsKit({
          network: WalletNetwork.PUBLIC,
          selectedWalletId: FREIGHTER_ID,
          modules: [new FreighterModule()],
        });
        const { address } = await kit.getAddress();
        
        // Validate address before setting it
        if (address && address !== 'null' && address !== 'undefined' && address.trim() !== '') {
          dispatch(setUserWalletAddress(address));
          console.log("Freighter address set:", address);
        } else {
          console.warn("Invalid address received from Freighter:", address);
        }
      } else if (walletTypes.LOBSTR === user?.walletName) {
        if (user?.userWalletAddress) return; // Already have address
        const publicKey = await getPublicKey();
        
        // Validate public key before setting it
        if (publicKey && publicKey !== 'null' && publicKey !== 'undefined' && publicKey.trim() !== '') {
          dispatch(setUserWalletAddress(publicKey));
          console.log("LOBSTR address set:", publicKey);
        } else {
          console.warn("Invalid public key received from LOBSTR:", publicKey);
        }
      }
    } catch (err) {
      console.error("Error getting wallet address:", err);
      dispatch(setWalletConnectName(null));
    }
  };

  const handleAddTrustline = async () => {
    const stellarService = new StellarService();

    console.log(user?.userWalletAddress);

    // Load sender's Stellar account
    const senderAccount = await stellarService.loadAccount(
      user?.userWalletAddress as string
    );

    // Build transaction
    const transactionBuilder = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.PUBLIC,
    });

    // Add trustline operation
    transactionBuilder.addOperation(
      Operation.changeTrust({
        asset: new Asset(aquaAssetCode, aquaAssetIssuer),
        limit: "1000000000",
      })
    );

    // Set timeout and build transaction
    const transaction = transactionBuilder.setTimeout(3000).build();

    // Sign transaction based on wallet type
    let signedTxXdr: string = "";

    if (user?.walletName === walletTypes.LOBSTR) {
      signedTxXdr = await signTransaction(transaction.toXDR());
    } else {
      const kit = new StellarWalletsKit({
        network: WalletNetwork.PUBLIC,
        selectedWalletId: FREIGHTER_ID,
        modules: [new FreighterModule()],
      });

      const { signedTxXdr: signed } = await kit.signTransaction(
        transaction.toXDR(),
        {
          address: user?.userWalletAddress || "",
          networkPassphrase: WalletNetwork.PUBLIC,
        }
      );

      signedTxXdr = signed;
    }

    const HORIZON_SERVER = "https://horizon.stellar.org";
    const transactionToSubmit = TransactionBuilder.fromXDR(
      signedTxXdr,
      HORIZON_SERVER
    );

    await stellarService?.server?.submitTransaction(transactionToSubmit);
  };

  useEffect(() => {
    if (user?.walletConnected || user?.userWalletAddress) {
      getAddress();
      dispatch(setWalletConnected(false));
      getWalletInfo();
      // handleAddTrustline();
    }
  }, [user?.walletConnected, user?.userWalletAddress]);

  return <Fragment>{children}</Fragment>;
}

export default MainProvider;
