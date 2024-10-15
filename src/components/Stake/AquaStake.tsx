import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  InputAdornment,
  InputBase,
} from "@mui/material";
import { toast } from "react-toastify";
import aquaLogo from "../../assets/images/aqua_logo.png";
import { TailSpin } from "react-loader-spinner";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import {
  FREIGHTER_ID,
  FreighterModule,
  LOBSTR_ID,
  LobstrModule,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { MIN_DEPOSIT_AMOUNT } from "../../config";
import { StellarService } from "../../services/stellar.service";
import {
  blubIssuerPublicKey,
  blubSignerPublicKey,
  JEWEL_TOKEN,
  lpSignerPublicKey,
  treasureAddress,
} from "../../utils/constants";
import {
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { useAppDispatch } from "../../lib/hooks";
import {
  getAccountInfo,
  lockingAqua,
  mint,
  provideLiquidity,
  providingLp,
  resetStateValues,
  restakeBlub,
  restaking,
  storeAccountBalance,
  unStakeAqua,
  unStakingAqua,
} from "../../lib/slices/userSlice";
import { summarizeAssets } from "../../lib/helpers";
import { DepositType } from "../../enums";

const aquaAssetCode = "AQUA";
const aquaAssetIssuer =
  "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";

const whlAssetCode = "WHLAQUA";
const whlAquaIssuer =
  "GCX6LOZ6ZEXBHLTPOPP2THN74K33LMT4HKSPDTWSLVCF4EWRGXOS7D3V";

interface Balance {
  asset_type:
    | "native"
    | "credit_alphanum4"
    | "credit_alphanum12"
    | "liquidity_pool_shares";
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

function AquaStake() {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);
  // const appRecords = useSelector((state: RootState) => state.app);
  const [isAquaStakeExpanded, setIsAquaStakeExpanded] = useState<boolean>(true);
  const [isBlubStakeExpanded, setIsBlubStakeExpanded] =
    useState<boolean>(false);
  const [aquaDepositAmount, setAquaDepositAmount] = useState<number | null>();
  const [lpBlubAmount, setLPBlubDepositAmount] = useState<number | null>();
  const [lpAquaAmount, setLpAquaDepositAmount] = useState<number | null>();
  const [blubUnstakeAmount, setBlubUnstakeAmount] = useState<number | null>(0);
  const [blubStakeAmount, setBlubStakeAmount] = useState<number | null>(0);

  // const appLpBalances = summarizeAssets(appRecords?.lp_balances);
  // const totalValueLocked = sumAssets(appRecords?.pools);

  //get user aqua record
  const aquaRecord = user?.userRecords?.balances?.find(
    (balance) => balance.asset_code === "AQUA"
  );

  const whlAquaRecord = user?.userRecords?.balances?.find(
    (balance) => balance.asset_code === "WHLAQUA"
  );

  const userAquaBalance = aquaRecord?.balance;
  // const whlAquaBalance = whlAquaRecord?.balance;
  const blubBalance = whlAquaRecord?.balance;

  //lp account records
  const accountLps = user?.userRecords?.account?.pools?.filter(
    (pool) => pool.depositType === DepositType.LIQUIDITY_PROVISION
  );

  const userPoolBalances =
    user?.userRecords?.account?.pools
      ?.filter((pool: any) => pool.claimed === "UNCLAIMED")
      ?.filter((pool: any) => pool.depositType === "LOCKER")
      ?.filter((pool: any) => pool.assetB.code === "AQUA")
      ?.reduce((total, record: any) => {
        return Number(total) + Number(record.assetBAmount);
      }, 0) || 0;

  // Calculate accountClaimableRecords
  const accountClaimableRecords =
    user?.userRecords?.account?.claimableRecords
      ?.filter((record: any) => record.claimed === "UNCLAIMED")
      ?.reduce((total, record: any) => {
        return Number(total) + Number(record.amount);
      }, 0) || 0;

  // Add the two calculated values
  const poolAndClaimBalance =
    Number(userPoolBalances) + Number(accountClaimableRecords);

  const handleSetMaxDeposit = () => {
    setAquaDepositAmount(Number(userAquaBalance));
  };

  const handleSetMaxDepositForBlub = () => {
    setBlubUnstakeAmount(Number(accountClaimableRecords));
  };

  const handleSetBlubMaxDeposit = () => {
    setLPBlubDepositAmount(Number(blubBalance));
  };

  const handleSetRestakeMaxDeposit = () => {
    setBlubStakeAmount(Number(blubBalance));
  };

  const handleAddTrustline = async () => {
    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId:
        user?.walletName === LOBSTR_ID ? LOBSTR_ID : FREIGHTER_ID,
      modules: [selectedModule],
    });

    const stellarService = new StellarService();
    const { address } = await kit.getAddress();
    const senderAccount = await stellarService.loadAccount(address);

    const transactionBuilder = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.PUBLIC,
    });

    const trustlineOperation = Operation.changeTrust({
      asset: new Asset(whlAssetCode, whlAquaIssuer),
      limit: "1000000000",
    });

    const transactionXDR = transactionBuilder
      .addOperation(trustlineOperation)
      .setTimeout(30)
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

    await stellarService?.server?.submitTransaction(transactionToSubmit);
  };

  const updateWalletRecords = async () => {
    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId: FREIGHTER_ID,
      modules: [selectedModule],
    });

    const { address } = await kit.getAddress();
    const stellarService = new StellarService();
    const wrappedAccount = await stellarService.loadAccount(address);

    dispatch(getAccountInfo(address));
    dispatch(storeAccountBalance(wrappedAccount.balances));
  };

  const handleLockAqua = async () => {
    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId:
        user?.walletName === LOBSTR_ID ? LOBSTR_ID : FREIGHTER_ID,
      modules: [selectedModule],
    });

    dispatch(lockingAqua(true));

    const stellarService = new StellarService();
    const { address } = await kit.getAddress();

    if (!address) {
      dispatch(lockingAqua(false));
      return toast.warn("Please connect wallet.");
    }

    if (!user) {
      dispatch(lockingAqua(false));
      return toast.warn("Global state not initialized.");
    }

    if (!aquaDepositAmount) {
      dispatch(lockingAqua(false));
      return toast.warn("Please input amount to stake.");
    }

    if (aquaDepositAmount < MIN_DEPOSIT_AMOUNT) {
      dispatch(lockingAqua(false));
      return toast.warn(
        `Deposit amount should be higher than ${MIN_DEPOSIT_AMOUNT}.`
      );
    }

    const senderAccount = await stellarService.loadAccount(address);
    const existingTrustlines = senderAccount.balances.map(
      (balance: Balance) => balance.asset_code
    );

    if (!existingTrustlines.includes(JEWEL_TOKEN)) {
      try {
        await handleAddTrustline();
        toast.success("Trustline added successfully.");
      } catch (error) {
        dispatch(lockingAqua(false));
        return toast.error("Failed to add trustline.");
      }
    }

    try {
      const customAsset = new Asset(aquaAssetCode, aquaAssetIssuer);
      const stakeAmount = aquaDepositAmount.toFixed(7);

      const paymentOperation = Operation.payment({
        destination: blubSignerPublicKey,
        asset: customAsset,
        amount: stakeAmount,
      });

      const transactionBuilder = new TransactionBuilder(senderAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.PUBLIC,
      });

      transactionBuilder.addOperation(paymentOperation).setTimeout(180);

      const transaction = transactionBuilder.build();

      const transactionXDR = transaction.toXDR();

      const { signedTxXdr } = await kit.signTransaction(transactionXDR, {
        address,
        networkPassphrase: WalletNetwork.PUBLIC,
      });

      dispatch(
        mint({
          assetCode: aquaAssetCode,
          assetIssuer: aquaAssetIssuer,
          amount: stakeAmount,
          signedTxXdr,
          senderPublicKey: address,
        })
      );

      dispatch(lockingAqua(true));
      toast.success("Transaction sent!");
    } catch (err) {
      console.error("Transaction failed:", err);
      dispatch(lockingAqua(false));
    }
  };

  const handleUnstakeAqua = async () => {
    if (poolAndClaimBalance < 1 || Number(blubUnstakeAmount) < 1)
      return toast.warn("Nothing to unstake");

    if (Number(blubUnstakeAmount) > poolAndClaimBalance)
      return toast.warn("Unstake amount exceeds the pool balance");

    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId:
        user?.walletName === LOBSTR_ID ? LOBSTR_ID : FREIGHTER_ID,
      modules: [selectedModule],
    });

    const { address } = await kit.getAddress();
    dispatch(unStakingAqua(true));
    dispatch(
      unStakeAqua({
        senderPublicKey: address,
        amountToUnstake: Number(blubUnstakeAmount),
      })
    );
  };

  const handleProvideLiquidity = async () => {
    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId:
        user?.walletName === LOBSTR_ID ? LOBSTR_ID : FREIGHTER_ID,
      modules: [selectedModule],
    });

    dispatch(providingLp(true));
    const wallet = await kit.getAddress();

    if (!wallet.address) {
      dispatch(providingLp(false));
      return toast.warn("Please connect wallet.");
    }

    if (!user) {
      dispatch(providingLp(false));
      return toast.warn("Global state not initialized");
    }

    if (!lpBlubAmount) {
      dispatch(providingLp(false));
      return toast.warn("Please input XLM amount to stake.");
    }

    if (!lpAquaAmount) {
      dispatch(providingLp(false));
      return toast.warn("Please input AQUA amount to stake.");
    }

    try {
      // Retrieve the wallet address from the Stellar Kit
      const stellarService = new StellarService();
      const senderAccount = await stellarService.loadAccount(wallet.address);

      // Load the sponsor (whaleHub) account details from the Stellar network
      await stellarService.loadAccount(lpSignerPublicKey);

      const aquaAsset = new Asset(aquaAssetCode, aquaAssetIssuer);

      const blubStakeAmount = lpBlubAmount.toFixed(7);
      const aquaStakeAmount = lpAquaAmount.toFixed(7);

      //transfer asset to server wallet
      const paymentOperation1 = Operation.payment({
        destination: lpSignerPublicKey,
        asset: aquaAsset,
        amount: `${blubStakeAmount}`,
      });

      const paymentOperation2 = Operation.payment({
        destination: lpSignerPublicKey,
        asset: new Asset(whlAssetCode, whlAquaIssuer),
        amount: `${aquaStakeAmount}`,
      });

      // Build transaction
      const transactionBuilder = new TransactionBuilder(senderAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.PUBLIC,
      })
        .addOperation(
          Operation.changeTrust({
            asset: aquaAsset,
            limit: "100000000",
            source: blubIssuerPublicKey,
          })
        )
        .addOperation(paymentOperation1)
        .addOperation(paymentOperation2)
        .setTimeout(30)
        .build();

      // Convert the transaction to XDR format for signing
      const transactionXDR = transactionBuilder.toXDR();

      const address = wallet.address;

      const { signedTxXdr } = await kit.signTransaction(transactionXDR, {
        address,
        networkPassphrase: WalletNetwork.PUBLIC,
      });

      dispatch(
        provideLiquidity({
          asset1: {
            ...new Asset(whlAssetCode, whlAquaIssuer),
            amount: blubStakeAmount,
          },
          asset2: {
            ...aquaAsset,
            amount: aquaStakeAmount,
          },
          signedTxXdr,
          senderPublicKey: address,
        })
      );
      dispatch(providingLp(true));
      toast.success("Transaction sent!");
    } catch (err) {
      console.error("Transaction failed:", err);
      dispatch(providingLp(false));
    }
  };

  const handleRestake = async () => {
    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId:
        user?.walletName === LOBSTR_ID ? LOBSTR_ID : FREIGHTER_ID,
      modules: [selectedModule],
    });

    const { address } = await kit.getAddress();

    if (!address) {
      dispatch(lockingAqua(false));
      return toast.warn("Please connect wallet.");
    }

    if (!user) {
      dispatch(lockingAqua(false));
      return toast.warn("Global state not initialized.");
    }

    if (!blubStakeAmount) {
      dispatch(lockingAqua(false));
      return toast.warn("Please input amount to stake.");
    }

    if (Number(blubBalance) < blubStakeAmount) {
      dispatch(lockingAqua(false));
      return toast.warn(`Your balance is low`);
    }

    dispatch(restaking(true));
    const stellarService = new StellarService();
    const senderAccount = await stellarService.loadAccount(address);

    const existingTrustlines = senderAccount.balances.map(
      (balance: Balance) => balance.asset_code
    );

    if (!existingTrustlines.includes(JEWEL_TOKEN)) return;

    try {
      const stakeAmount = blubStakeAmount.toFixed(7);

      const paymentOperation = Operation.payment({
        destination: lpSignerPublicKey,
        asset: new Asset(whlAssetCode, whlAquaIssuer),
        amount: stakeAmount,
      });

      const transactionBuilder = new TransactionBuilder(senderAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.PUBLIC,
      });

      transactionBuilder.addOperation(paymentOperation).setTimeout(180);

      const transaction = transactionBuilder.build();

      const transactionXDR = transaction.toXDR();

      const { signedTxXdr } = await kit.signTransaction(transactionXDR, {
        address,
        networkPassphrase: WalletNetwork.PUBLIC,
      });

      dispatch(
        restakeBlub({
          assetCode: "WHLAQUA",
          assetIssuer: blubIssuerPublicKey,
          amount: `${blubStakeAmount}`,
          signedTxXdr,
          senderPublicKey: address,
        })
      );
      dispatch(restaking(true));
    } catch (err) {
      console.log(err);
      dispatch(restaking(false));
    }
  };

  useEffect(() => {
    if (user?.lockedAqua) {
      updateWalletRecords();
      toast.success("Aqua locked successfully!");
      setAquaDepositAmount(0);
      dispatch(lockingAqua(false));
      dispatch(resetStateValues());
    }

    if (user?.providedLp) {
      updateWalletRecords();
      toast.success("Provided Liquidity successfully!");
      setLpAquaDepositAmount(0);
      setLPBlubDepositAmount(0);
      dispatch(providingLp(false));
      dispatch(resetStateValues());
    }

    if (user?.unStakedAqua) {
      updateWalletRecords();
      toast.success("Blub unstaked successfully!");
      dispatch(resetStateValues());
      dispatch(unStakingAqua(false));
    }

    if (user?.restaked) {
      updateWalletRecords();
      toast.success("BLUB Locked successfully!");
      dispatch(resetStateValues());
      dispatch(restaking(false));
    }
  }, [user?.lockedAqua, user?.providedLp, user?.unStakedAqua, user?.restaked]);

  return (
    <>
      <div className="flex flex-col gap-[21px] w-full mt-[21px]">
        {/* Native staking */}

        <div className="w-full bg-[rgb(18,18,18)] bg-[linear-gradient(rgba(255,255,255,0.05),rgba(255,255,255,0.05))] rounded-[4px]">
          <Accordion expanded={isAquaStakeExpanded}>
            <AccordionSummary
              id="panel1a-header"
              aria-controls="panel1a-content"
              className="w-full !cursor-default"
            >
              <div className="grid grid-cols-12 w-full text-[12.6px] px-[10.5px]">
                <div className="col-span-12 md:col-span-3 flex items-center md:px-[10.5px] mb-2">
                  <div className="flex items-center">
                    <div className="flex justify-center items-center w-[50px] h-[50px] mx-[7px]">
                      <img src={aquaLogo} alt="sol-logo" className="w-full" />
                    </div>
                    <div>AQUA</div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-2 flex flex-col justify-center md:px-[10.5px]">
                  {/* <div>TVL</div>
                  <div>{totalValueLocked?.total} total locked</div> */}
                </div>

                <div className="col-span-12 md:col-span-1 md:px-[10.5px]"></div>

                <div className="col-span-12 md:col-span-3 flex items-center md:px-[10.5px]">
                  {/* <div className="flex justify-between items-center w-full">
                    <div>Your balance</div>
                    <div className="text-end">
                      <div>100 AQUA</div>
                      <div>200 JWLAQUA</div>
                    </div>
                  </div> */}
                </div>

                <div className="col-span-12 md:col-span-1 md:px-[10.5px]"></div>

                <div className="col-span-12 md:col-span-2 flex items-center md:px-[10.5px]">
                  <button
                    className="flex justify-center items-center w-full p-[7px] border border-solid border-[rgba(16,197,207,0.6)] rounded-[5px]"
                    onClick={() => setIsAquaStakeExpanded(!isAquaStakeExpanded)}
                  >
                    <span>Stake</span>
                    {isAquaStakeExpanded ? (
                      <KeyboardArrowUpIcon className="text-white" />
                    ) : (
                      <KeyboardArrowDownIcon className="text-white" />
                    )}
                  </button>
                </div>
              </div>
            </AccordionSummary>

            <AccordionDetails sx={{ padding: "0px 16px 16px" }}>
              <div className="grid mt-[14px] px-4">
                Mint BLUB token by locking ACQUA token and receive the share of
                Acqua governance and yield farming rewards. BLUB is
                automatically staked with an option to unstake and add liquidity
                in ACQUA-BLUB pool.
              </div>
              <div className="grid grid-cols-12 gap-[20px] md:gap-0 w-full mt-[20px]">
                <div className="col-span-12 md:col-span-6">
                  <div className="grid grid-cols-12 gap-[10px] md:gap-0 w-full">
                    <div className="col-span-12 md:col-span-6 flex flex-col px-[10.5px]">
                      <div>{`Avail AQUA Balance: ${Number(
                        userAquaBalance
                      )?.toFixed(2)} AQUA`}</div>

                      <InputBase
                        sx={{
                          flex: 1,
                          border: "1px",
                          borderStyle: "solid",
                          borderRadius: "5px",
                          borderColor: "gray",
                          padding: "2px 5px",
                        }}
                        endAdornment={
                          <InputAdornment
                            position="end"
                            sx={{ cursor: "pointer" }}
                            onClick={handleSetMaxDeposit}
                          >
                            Max
                          </InputAdornment>
                        }
                        type="number"
                        placeholder="0.00"
                        disabled={user?.lockingAqua}
                        value={
                          aquaDepositAmount != null ? aquaDepositAmount : ""
                        }
                        className="mt-[3.5px]"
                        onChange={(e) =>
                          setAquaDepositAmount(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                      <div className="flex space-x-4">
                        <button
                          disabled={
                            user?.lockingAqua || !user?.userWalletAddress
                          }
                          className="flex justify-center items-center w-fit p-[7px_21px] mt-[7px] border-radius-1 rounded-md bg-[rgba(16,197,207,0.6)]"
                          onClick={handleLockAqua}
                        >
                          {!user?.lockingAqua ? (
                            <span>Mint</span>
                          ) : (
                            <div className="flex justify-center items-center gap-[10px]">
                              <span className="text-white">Processing...</span>
                              <TailSpin
                                height="18"
                                width="18"
                                color="#ffffff"
                                ariaLabel="tail-spin-loading"
                                radius="1"
                                wrapperStyle={{}}
                                wrapperClass=""
                                visible={true}
                              />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="block md:hidden col-span-12 w-full italic px-[10.5px]"></div>

                <div className="col-span-12 md:col-span-6">
                  <div className="grid grid-cols-12 gap-[10px] md:gap-0 w-full">
                    <div className="col-span-12 md:col-span-4 px-[10.5px]">
                      {/* <div className="flex justify-start md:justify-center">
                        <div>SOL Reserved to Redeem</div>
                      </div> */}
                      <div className="flex justify-start md:justify-center mt-[5px] md:mt-[21px]">
                        <div>
                          {/* {userInfoAccountInfo &&
                            (
                              userInfoAccountInfo.reservedRedeemAmount.toNumber() /
                              LAMPORTS_PER_SOL
                            ).toLocaleString()} */}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4 px-[10.5px]">
                      {/* <div className="flex justify-start md:justify-center">
                        <div>Unbonding Epoch</div>
                      </div> */}
                      <div className="flex justify-start md:justify-center mt-[5px] md:mt-[21px]">
                        <div>
                          {/* {userInfoAccountInfo &&
                          (userInfoAccountInfo.reservedRedeemAmount.toNumber() >
                            0 ||
                          userInfoAccountInfo.approvedRedeemAmount.toNumber() >
                              0)
                            ? userInfoAccountInfo.lastRedeemReservedEpoch.toNumber() +
                              UNBOINDING_PERIOD +
                              1
                            : "-"} */}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4 px-[10.5px]">
                      <div className="flex justify-start md:justify-center relative group">
                        <div>Total accumulated rewards</div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 max-w-xs bg-gray-700 text-white text-sm rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity break-words">
                          A total accumulated BLUB rewards, distributed
                          automatically for all stakers of WhaleHub
                        </div>
                      </div>
                      <div className="flex justify-start md:justify-center mt-[5px] md:mt-[21px]">
                        <div>{user?.userLockedRewardsAmount}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionDetails>
          </Accordion>
        </div>

        <div className="w-full bg-[rgb(18,18,18)] bg-[linear-gradient(rgba(255,255,255,0.05),rgba(255,255,255,0.05))] rounded-[4px]">
          <Accordion expanded={isBlubStakeExpanded}>
            <AccordionSummary
              id="panel1a-header"
              aria-controls="panel1a-content"
              className="w-full !cursor-default"
            >
              <div className="grid grid-cols-12 w-full text-[12.6px] px-[10.5px]">
                <div className="col-span-12 md:col-span-3 flex items-center md:px-[10.5px] mb-2">
                  <div className="flex items-center">
                    <div>Stake</div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-2 flex flex-col justify-center md:px-[10.5px]">
                  {/* <div>TVL</div>
                  <div>{totalValueLocked?.total} total locked</div> */}
                </div>

                <div className="col-span-12 md:col-span-1 md:px-[10.5px]"></div>

                <div className="col-span-12 md:col-span-3 flex items-center md:px-[10.5px]">
                  {/* <div className="flex justify-between items-center w-full">
                    <div>Your balance</div>
                    <div className="text-end">
                      <div>100 AQUA</div>
                      <div>200 JWLAQUA</div>
                    </div>
                  </div> */}
                </div>

                <div className="col-span-12 md:col-span-1 md:px-[10.5px]"></div>

                <div className="col-span-12 md:col-span-2 flex items-center md:px-[10.5px]">
                  <button
                    className="flex justify-center items-center w-full p-[7px] border border-solid border-[rgba(16,197,207,0.6)] rounded-[5px]"
                    onClick={() => setIsBlubStakeExpanded(!isBlubStakeExpanded)}
                  >
                    <span>Stake/Unstake</span>
                    {isBlubStakeExpanded ? (
                      <KeyboardArrowUpIcon className="text-white" />
                    ) : (
                      <KeyboardArrowDownIcon className="text-white" />
                    )}
                  </button>
                </div>
              </div>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: "0px 16px 16px" }}>
              <div className="grid grid-cols-12 gap-[20px] md:gap-0 w-full mt-[14px]">
                <div className="col-span-12 md:col-span-6">
                  <div className="grid grid-cols-12 gap-[10px] md:gap-0 w-full">
                    <div className="col-span-12 md:col-span-6">
                      <div className="grid grid-cols-12 gap-[10px] md:gap-0 w-full">
                        <div className="col-span-12 md:col-span-6 flex flex-col px-[10.5px]">
                          <div>{`BLUB ${Number(blubBalance)?.toFixed(2)}`}</div>

                          <InputBase
                            sx={{
                              flex: 1,
                              border: "1px",
                              borderStyle: "solid",
                              borderRadius: "5px",
                              borderColor: "gray",
                              padding: "2px 5px",
                            }}
                            endAdornment={
                              <InputAdornment
                                position="end"
                                sx={{ cursor: "pointer" }}
                                onClick={handleSetRestakeMaxDeposit}
                              >
                                Max
                              </InputAdornment>
                            }
                            type="number"
                            placeholder="0.00"
                            disabled={user?.lockingAqua}
                            value={
                              blubStakeAmount != null ? blubStakeAmount : ""
                            }
                            className="mt-[3.5px]"
                            onChange={(e) =>
                              setBlubStakeAmount(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="col-span-12 md:col-span-6 px-2">
                        <button
                          className="flex justify-center items-center w-fit p-[7px_21px] mt-[7px]  rounded-md bg-[rgba(16,197,207,0.6)]"
                          // disabled={user?.restaking || !user?.userWalletAddress}
                          onClick={handleRestake}
                        >
                          {!user?.restaking ? (
                            <span>Stake </span>
                          ) : (
                            <div className="flex justify-center items-center gap-[10px]">
                              <span className="text-white">Processing...</span>
                              <TailSpin
                                height="18"
                                width="18"
                                color="#ffffff"
                                ariaLabel="tail-spin-loading"
                                radius="1"
                                wrapperStyle={{}}
                                wrapperClass=""
                                visible={true}
                              />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-6 flex flex-col px-[10.5px]">
                      <div>{`BLUB to unstake: ${Number(
                        poolAndClaimBalance
                      )?.toFixed(2)}`}</div>

                      <InputBase
                        sx={{
                          flex: 1,
                          border: "1px",
                          borderStyle: "solid",
                          borderRadius: "5px",
                          borderColor: "gray",
                          padding: "2px 5px",
                        }}
                        endAdornment={
                          <InputAdornment
                            position="end"
                            sx={{ cursor: "pointer" }}
                            onClick={handleSetMaxDepositForBlub}
                          >
                            Max
                          </InputAdornment>
                        }
                        type="number"
                        placeholder="0.00"
                        disabled={user?.lockingAqua}
                        value={
                          blubUnstakeAmount != null ? blubUnstakeAmount : ""
                        }
                        className="mt-[3.5px]"
                        onChange={(e) =>
                          setBlubUnstakeAmount(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                      <div className="flex space-x-4">
                        <button
                          // disabled={
                          //   user?.unStakingAqua || !user?.userWalletAddress
                          // }
                          className="flex justify-center items-center w-fit p-[7px_21px] mt-[7px]  rounded-md bg-[rgba(16,197,207,0.6)]"
                          onClick={handleUnstakeAqua}
                        >
                          {!user?.unStakingAqua ? (
                            <span>Unstake</span>
                          ) : (
                            <div className="flex justify-center items-center gap-[10px]">
                              <span className="text-white">Processing...</span>
                              <TailSpin
                                height="18"
                                width="18"
                                color="#ffffff"
                                ariaLabel="tail-spin-loading"
                                radius="1"
                                wrapperStyle={{}}
                                wrapperClass=""
                                visible={true}
                              />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="block md:hidden col-span-12 w-full italic px-[10.5px]"></div>

                <div className="col-span-12 md:col-span-6">
                  <div className="grid grid-cols-12 gap-[10px] md:gap-0 w-full">
                    <div className="col-span-12 md:col-span-4 px-[10.5px]">
                      {/* <div className="flex justify-start md:justify-center">
                        <div>SOL Reserved to Redeem</div>
                      </div> */}
                      <div className="flex justify-start md:justify-center mt-[5px] md:mt-[21px]">
                        <div>
                          {/* {userInfoAccountInfo &&
                            (
                              userInfoAccountInfo.reservedRedeemAmount.toNumber() /
                              LAMPORTS_PER_SOL
                            ).toLocaleString()} */}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4 px-[10.5px]">
                      {/* <div className="flex justify-start md:justify-center">
                        <div>Unbonding Epoch</div>
                      </div> */}
                      <div className="flex justify-start md:justify-center mt-[5px] md:mt-[21px]">
                        <div>
                          {/* {userInfoAccountInfo &&
                          (userInfoAccountInfo.reservedRedeemAmount.toNumber() >
                            0 ||
                          userInfoAccountInfo.approvedRedeemAmount.toNumber() >
                              0)
                            ? userInfoAccountInfo.lastRedeemReservedEpoch.toNumber() +
                              UNBOINDING_PERIOD +
                              1
                            : "-"} */}
                        </div>
                      </div>
                    </div>

                    {/* <div className="col-span-12 md:col-span-4 px-[10.5px]">
                      <div className="flex justify-start md:justify-center">
                        <div>Unbonded Reward</div>
                      </div>
                      <div className="flex justify-start md:justify-center mt-[5px] md:mt-[21px]">
                        <div>{user?.userLockedRewardsAmount}</div>
                      </div>
                    </div> */}
                  </div>
                </div>
              </div>
            </AccordionDetails>
          </Accordion>
        </div>
        <div className="w-full bg-[rgb(18,18,18)] bg-[linear-gradient(rgba(255,255,255,0.05),rgba(255,255,255,0.05))] rounded-[4px]">
          <Accordion expanded={isBlubStakeExpanded}>
            <AccordionSummary
              id="panel1a-header"
              aria-controls="panel1a-content"
              className="w-full !cursor-default"
            >
              <div className="grid grid-cols-12 w-full text-[12.6px] px-[10.5px]">
                <div className="col-span-12 md:col-span-3 flex items-center md:px-[10.5px] mb-2">
                  <div className="flex items-center">
                    <div>Provide Liquidity</div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-2 flex flex-col justify-center md:px-[10.5px]">
                  {/* <div>TVL</div>
                  <div>{totalValueLocked?.total} total locked</div> */}
                </div>

                <div className="col-span-12 md:col-span-1 md:px-[10.5px]"></div>

                <div className="col-span-12 md:col-span-3 flex items-center md:px-[10.5px]">
                  {/* <div className="flex justify-between items-center w-full">
                    <div>Your balance</div>
                    <div className="text-end">
                      <div>100 AQUA</div>
                      <div>200 JWLAQUA</div>
                    </div>
                  </div> */}
                </div>

                <div className="col-span-12 md:col-span-1 md:px-[10.5px]"></div>

                <div className="col-span-12 md:col-span-2 flex items-center md:px-[10.5px]">
                  <button
                    className="flex justify-center items-center w-full p-[7px] border border-solid border-[rgba(16,197,207,0.6)] rounded-[5px]"
                    onClick={() => setIsBlubStakeExpanded(!isBlubStakeExpanded)}
                  >
                    <span>PROVIDE LIQUIDITY</span>
                    {isBlubStakeExpanded ? (
                      <KeyboardArrowUpIcon className="text-white" />
                    ) : (
                      <KeyboardArrowDownIcon className="text-white" />
                    )}
                  </button>
                </div>
              </div>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: "0px 16px 16px" }}>
              {/* lp section */}
              <div className="grid grid-cols-12 gap-[20px] md:gap-0 w-full mt-[14px]">
                <div className="col-span-12 md:col-span-6">
                  <div className="grid grid-cols-12 gap-[10px] md:gap-0 w-full">
                    <div className="col-span-12 md:col-span-6 flex flex-col px-[10.5px]">
                      <div>{`BLUB ${Number(blubBalance)?.toFixed(2)}`}</div>

                      <InputBase
                        sx={{
                          flex: 1,
                          border: "1px",
                          borderStyle: "solid",
                          borderRadius: "5px",
                          borderColor: "gray",
                          padding: "2px 5px",
                        }}
                        endAdornment={
                          <InputAdornment
                            position="end"
                            sx={{ cursor: "pointer" }}
                            onClick={handleSetBlubMaxDeposit}
                          >
                            Max
                          </InputAdornment>
                        }
                        type="number"
                        placeholder="0.00"
                        disabled={user?.lockingAqua}
                        value={lpBlubAmount != null ? lpBlubAmount : ""}
                        className="mt-[3.5px]"
                        onChange={(e) =>
                          setLPBlubDepositAmount(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6 flex flex-col px-[10.5px] text-sm">
                      <div>{`Avail AQUA Balance: ${Number(
                        userAquaBalance
                      ).toFixed(2)} AQUA`}</div>

                      <InputBase
                        sx={{
                          flex: 1,
                          border: "1px",
                          borderStyle: "solid",
                          borderRadius: "5px",
                          borderColor: "gray",
                          padding: "2px 5px",
                        }}
                        endAdornment={
                          <InputAdornment
                            position="end"
                            sx={{ cursor: "pointer" }}
                            onClick={() =>
                              setLpAquaDepositAmount(Number(userAquaBalance))
                            }
                          >
                            Max
                          </InputAdornment>
                        }
                        type="number"
                        placeholder="10.00"
                        value={lpAquaAmount != null ? lpAquaAmount : ""}
                        className="mt-[3.5px]"
                        onChange={(e) =>
                          setLpAquaDepositAmount(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6 px-2">
                    <button
                      className="flex justify-center items-center w-fit p-[7px_21px] mt-[7px]  rounded-md bg-[rgba(16,197,207,0.6)]"
                      disabled={user?.providingLp || !user?.userWalletAddress}
                      onClick={handleProvideLiquidity}
                    >
                      {!user?.providingLp ? (
                        <span>Provide Liquidity</span>
                      ) : (
                        <div className="flex justify-center items-center gap-[10px]">
                          <span className="text-white">Processing...</span>
                          <TailSpin
                            height="18"
                            width="18"
                            color="#ffffff"
                            ariaLabel="tail-spin-loading"
                            radius="1"
                            wrapperStyle={{}}
                            wrapperClass=""
                            visible={true}
                          />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </AccordionDetails>
          </Accordion>
        </div>
      </div>
    </>
  );
}

export default AquaStake;
