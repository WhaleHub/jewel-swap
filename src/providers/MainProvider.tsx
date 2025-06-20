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
    if (!user?.walletName || !user?.userWalletAddress) return;
    
    try {
      const stellarService = new StellarService();
      const address = user.userWalletAddress;
      
      console.log('Fetching wallet info for:', address, 'with wallet:', user.walletName);
      
      const wrappedAccount = await stellarService.loadAccount(address);
      console.log('Account balances:', wrappedAccount.balances);

      // Force refresh all user data
      await Promise.all([
        dispatch(getAppData()),
        dispatch(setUserbalances(wrappedAccount.balances)),
        dispatch(getAccountInfo(address)),
        dispatch(getLockedAquaRewardsForAccount(address))
      ]);
      
      dispatch(fetchingWalletInfo(false));
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      dispatch(fetchingWalletInfo(false));
    }
  };

  const getRewards = async () => {
    const address = user?.userRecords?.account?.account;
    if (address) getLockedAquaRewardsForAccount(address);
  };

  const getAddress = async () => {
    try {
      if (walletTypes.FREIGHTER === user?.walletName) {
        if (user?.walletName) return;
        const kit: StellarWalletsKit = new StellarWalletsKit({
          network: WalletNetwork.PUBLIC,
          selectedWalletId: FREIGHTER_ID,
          modules: [new FreighterModule()],
        });
        const { address } = await kit.getAddress();
        dispatch(setUserWalletAddress(address));
      } else if (walletTypes.LOBSTR === user?.walletName) {
        if (user?.walletName) return;
        const publicKey = await getPublicKey();
        dispatch(setUserWalletAddress(publicKey));
      }
    } catch (err) {
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

  // Add auto-refresh for balances every 30 seconds when wallet is connected
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (user?.userWalletAddress && user?.walletName) {
      intervalId = setInterval(() => {
        console.log('Auto-refreshing wallet balances...');
        getWalletInfo();
      }, 30000); // 30 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user?.userWalletAddress, user?.walletName]);

  return <Fragment>{children}</Fragment>;
}

export default MainProvider;
