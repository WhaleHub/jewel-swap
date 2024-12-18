import { Fragment, ReactNode, useCallback, useEffect, useState } from "react";
import {
  allowAllModules,
  FREIGHTER_ID,
  FreighterModule,
  LOBSTR_ID,
  LobstrModule,
  ModuleInterface,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { isAllowed, setAllowed } from "@stellar/freighter-api";
import { StellarService } from "../services/stellar.service";
import { useAppDispatch } from "../lib/hooks";
import {
  fetchingWalletInfo,
  getAccountInfo,
  getLockedAquaRewardsForAccount,
  logOut,
  setConnectingWallet,
  setUserWalletAddress,
  setWalletConnected,
  setWalletConnectName,
  storeAccountBalance,
  walletSelectionAction,
} from "../lib/slices/userSlice";
import { getAppData } from "../lib/slices/appSlice";
import { useSelector } from "react-redux";
import { RootState } from "../lib/store";
import { walletTypes } from "../enums";
import { TailSpin } from "react-loader-spinner";
import {
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { blubAssetCode, blubIssuer } from "../utils/constants";
import * as StellarSdk from "@stellar/stellar-sdk";

interface MainProviderProps {
  children: ReactNode;
}

function MainProvider({ children }: MainProviderProps): JSX.Element {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);

  const getWalletAddress = async () => {
    if (!user?.walletName) return;

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });

    const { address } = await kit.getAddress();

    const stellarService = new StellarService();
    const wrappedAccount = await stellarService.loadAccount(address);
    dispatch(getAppData());
    dispatch(storeAccountBalance(wrappedAccount.balances));
    dispatch(getAccountInfo(address));
    dispatch(fetchingWalletInfo(false));
    dispatch(getLockedAquaRewardsForAccount(address));
  };

  const getRewards = async () => {
    const address = user?.userRecords?.account?.account;
    if (address) getLockedAquaRewardsForAccount(address);
  };

  const getAddress = async () => {
    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId: FREIGHTER_ID,
      modules: [new FreighterModule()],
    });

    const { address } = await kit.getAddress();

    dispatch(setUserWalletAddress(address));
  };

  const handleAddTrustline = async () => {
    try {
      // const selectedModule =
      //   user?.walletName === LOBSTR_ID
      //     ? new LobstrModule()
      //     : new FreighterModule();

      const kit = new StellarWalletsKit({
        network: WalletNetwork.PUBLIC,
        selectedWalletId: FREIGHTER_ID,
        modules: [new FreighterModule()],
      });

      const stellarService = new StellarService();
      const { address } = await kit.getAddress();
      const senderAccount = await stellarService.loadAccount(address);

      const transactionBuilder = new TransactionBuilder(senderAccount, {
        fee: BASE_FEE,
        networkPassphrase: WalletNetwork.PUBLIC,
      });

      const trustlineOperation = Operation.changeTrust({
        asset: new Asset(blubAssetCode, blubIssuer),
        limit: "1000000000",
      });

      const transactionXDR = transactionBuilder
        .addOperation(trustlineOperation)
        .setTimeout(30000)
        .build()
        .toXDR();

      const { signedTxXdr } = await kit.signTransaction(transactionXDR, {
        address,
        networkPassphrase: WalletNetwork.PUBLIC,
      });

      const HORIZON_SERVER = "https://horizon.stellar.org";

      const transactionToSubmit = TransactionBuilder.fromXDR(
        signedTxXdr,
        HORIZON_SERVER
      );

      const server = new StellarSdk.Horizon.Server(HORIZON_SERVER);
      await server.submitTransaction(transactionToSubmit);
      console.log("sent");
    } catch (error: any) {
      if (error.response) {
        // Horizon error
        console.error("Horizon Error:", error.response.data.extras);
        return;
        console.error("Operation failed:", error.response.data.extras);
        switch (error.response.data.extras.result_codes.operations[0]) {
          case "op_low_reserve":
            console.error("Account has insufficient XLM to add trustline");
            break;
          case "op_invalid_limit":
            console.error("Invalid trustline limit");
            break;
          default:
            console.error("Unknown error:", error.response.data);
        }
      } else {
        console.error("Transaction failed:", error);
      }
    }
  };

  useEffect(() => {
    // handleAddTrustline();
    if (user?.walletConnected) {
      getAddress();
      dispatch(setWalletConnected(false));
    }
  }, [user?.walletConnected]);

  return <Fragment>{children}</Fragment>;
}

export default MainProvider;
