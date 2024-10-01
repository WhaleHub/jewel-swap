import React, { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  InputAdornment,
  InputBase,
} from "@mui/material";
import { toast } from "react-toastify";
import { convertSecondsToDateTime } from "../../utils";
import { IEpochInfo } from "../../interfaces";
import aquaLogo from "../../assets/images/aqua_logo.png";
import { TailSpin } from "react-loader-spinner";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import {
  allowAllModules,
  FREIGHTER_ID,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { MIN_DEPOSIT_AMOUNT } from "../../config";
import { AccountService } from "../../utils/account.service";
import { StellarService } from "../../services/stellar.service";
import {
  blubIssuerPublicKey,
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
  mint,
  provideLiquidity,
  redeemLPReward,
  withdrawLP,
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

interface SummarizedAssets {
  [key: string]: {
    assetCode: string;
    totalAmount: string;
  };
}

function AquaStake() {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);
  const appRecords = useSelector((state: RootState) => state.app);

  const [epochInfo, setEpochInfo] = useState<IEpochInfo>();
  const [isNativeStakeExpanded, setIsNativeStakeExpanded] =
    useState<boolean>(false);
  const [aquaDepositAmount, setAquaDepositAmount] = useState<number | null>();
  const [isDepositingAqua, setIsDepositingAqua] = useState<boolean>(false);
  const [isReservingRedeem, setIsReservingRedeem] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isProviding, setProviding] = useState<boolean>(false);
  const [lqXlmAmount, setXlmAmount] = useState<number | null>();
  const [lqAquaAmount, setLqAquaAmount] = useState<number | null>();
  const [reserveRedeemAmount, setReserveRedeemAmount] = useState<
    number | null
  >();

  //get user aqua record
  const aquaRecord = user?.userRecords?.balances?.find(
    (balance) => balance.asset_code === "AQUA"
  );

  const whlAquaRecord = user?.userRecords?.balances?.find(
    (balance) => balance.asset_code === "WHLAQUA"
  );

  const xlmRecord = user?.userRecords?.balances?.find(
    (balance: any) => balance.asset_type === "native"
  );

  const userAquaBalance = aquaRecord?.balance;
  const whlAquaBalance = whlAquaRecord?.balance;
  const xlmBalance = xlmRecord?.balance;

  //lp account records
  const accountLps = user?.userRecords?.account?.pools?.filter(
    (pool) => pool.depositType === DepositType.LIQUIDITY_PROVISION
  );

  // const poolBalances = summarizeAssets(userLps);

  //pools
  const userLpProvisions = user?.userRecords?.account?.lpBalances;
  const userPoolBalances = summarizeAssets(userLpProvisions);
  const appLpBalances = summarizeAssets(appRecords?.lp_balances);

  const kit: StellarWalletsKit = new StellarWalletsKit({
    network: WalletNetwork.PUBLIC,
    selectedWalletId: FREIGHTER_ID,
    modules: allowAllModules(),
  });

  const handleSetMaxDeposit = () => {
    setAquaDepositAmount(Number(userAquaBalance));
  };

  const handleSetXLMMaxDeposit = () => {
    setXlmAmount(Number(xlmBalance));
  };

  const handleDepositAqua = async () => {
    const wallet = await kit.getAddress();

    if (!wallet.address) {
      return toast.warn("Please connect wallet.");
    }

    if (!user) {
      return toast.warn("Global state not initialized");
    }

    if (!aquaDepositAmount) {
      return toast.warn("Please input amount to stake.");
    }

    if (aquaDepositAmount < MIN_DEPOSIT_AMOUNT) {
      return toast.warn(
        `Deposit amount should be higher than ${MIN_DEPOSIT_AMOUNT}.`
      );
    }

    setIsProcessing(true);
    setIsDepositingAqua(true);

    try {
      // Retrieve the wallet address from the Stellar Kit
      const { address } = await kit.getAddress();
      const stellarService = new StellarService();

      const senderAccount = await stellarService.loadAccount(address);
      const treasureAccount = await stellarService.loadAccount(treasureAddress);

      // Load the sponsor (whaleHub) account details from the Stellar network
      await stellarService.loadAccount(treasureAddress);
      await stellarService.loadAccount(blubIssuerPublicKey);

      // Define the custom asset using the provided code and issuer
      const customAsset = new Asset(aquaAssetCode, aquaAssetIssuer);

      const stakeAmount = (aquaDepositAmount * 0.7).toFixed(7);
      const treasuryAmount = (aquaDepositAmount * 0.3).toFixed(7);

      // Create the payment operation to transfer the custom asset to DAPP
      const paymentOperation = Operation.payment({
        destination: blubIssuerPublicKey,
        asset: customAsset,
        amount: `${stakeAmount}`,
      });

      // Create the payment operation to transfer the custom asset to treasury address
      const paymentOperation2 = Operation.payment({
        destination: treasureAddress,
        asset: customAsset,
        amount: `${treasuryAmount}`,
      });

      // Build transaction
      const transactionBuilder = new TransactionBuilder(senderAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.PUBLIC,
      });

      let trustlineOperationAdded = false;
      const existingTrustlines = senderAccount.balances.map(
        (balance: Balance) => balance.asset_code
      );

      const treasureAccountTrustlines = treasureAccount.balances.map(
        (balance: Balance) => balance.asset_code
      );

      transactionBuilder
        .addOperation(
          Operation.changeTrust({
            asset: customAsset,
            limit: "100000000",
            source: blubIssuerPublicKey,
          })
        )
        .addOperation(
          Operation.changeTrust({
            asset: customAsset,
            limit: "100000000",
            source: blubIssuerPublicKey,
          })
        );

      if (!treasureAccountTrustlines.includes("AQUA")) {
        transactionBuilder.addOperation(
          Operation.changeTrust({
            asset: new Asset(aquaAssetCode, aquaAssetIssuer),
            limit: "100000000",
            source: treasureAddress,
          })
        );
        trustlineOperationAdded = true;
      }

      if (!existingTrustlines.includes("WHLAQUA")) {
        transactionBuilder.addOperation(
          Operation.changeTrust({
            asset: new Asset(whlAssetCode, whlAquaIssuer),
            limit: "100000000",
            source: address,
          })
        );
        trustlineOperationAdded = true;
      }

      // Add the payment operation and set the timeout
      transactionBuilder
        .addOperation(paymentOperation)
        .addOperation(paymentOperation2)
        .setTimeout(180);

      // Build the transaction
      const transaction = transactionBuilder.build();

      // Convert the transaction to XDR format for signing
      const transactionXDR = transaction.toXDR();

      // Sign the transaction using the Stellar Wallets Kit
      const { signedTxXdr } = await kit.signTransaction(transactionXDR, {
        address,
        networkPassphrase: WalletNetwork.PUBLIC,
      });

      dispatch(
        mint({
          assetCode: aquaAssetCode,
          assetIssuer: aquaAssetIssuer,
          amount: stakeAmount,
          treasuryAmount,
          signedTxXdr,
          senderPublicKey: address,
        })
      );

      setIsProcessing(false);
      setIsDepositingAqua(false);
    } catch (err) {
      console.log(err);
      setIsProcessing(false);
      setIsDepositingAqua(false);
    }
  };

  const handleProvideLiquidity = async () => {
    const wallet = await kit.getAddress();
    setProviding(true);

    if (!wallet.address) {
      return toast.warn("Please connect wallet.");
    }

    if (!user) {
      return toast.warn("Global state not initialized");
    }

    if (!lqXlmAmount) {
      return toast.warn("Please input XLM amount to stake.");
    }

    if (!lqAquaAmount) {
      return toast.warn("Please input AQUA amount to stake.");
    }

    try {
      // Retrieve the wallet address from the Stellar Kit
      const stellarService = new StellarService();
      const senderAccount = await stellarService.loadAccount(wallet.address);

      // Load the sponsor (whaleHub) account details from the Stellar network
      await stellarService.loadAccount(blubIssuerPublicKey);

      const aquaAsset = new Asset(aquaAssetCode, aquaAssetIssuer);

      const xlmStakeAmount = lqXlmAmount.toFixed(7);
      const aquaStakeAmount = lqAquaAmount.toFixed(7);

      //transfer asset to server wallet
      const paymentOperation1 = Operation.payment({
        destination: blubIssuerPublicKey,
        asset: aquaAsset,
        amount: `${xlmStakeAmount}`,
      });

      const paymentOperation2 = Operation.payment({
        destination: blubIssuerPublicKey,
        asset: Asset.native(),
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
            ...Asset.native(),
            amount: xlmStakeAmount,
          },
          asset2: {
            ...aquaAsset,
            amount: aquaStakeAmount,
          },
          signedTxXdr,
          senderPublicKey: address,
        })
      );
      setProviding(false);
    } catch (err) {
      setProviding(false);
    }
  };

  //TODO: UPDATE INTERFACE
  function getTotalPoolValue(assets: any) {
    let totalValue = 0;
    for (const asset in assets) {
      totalValue += parseFloat(assets[asset].totalAmount);
    }
    return totalValue;
  }

  const withdrawLprovision = async () => {
    const totalPoolValue = getTotalPoolValue(appLpBalances);
    const userTotalPoolValue = getTotalPoolValue(userPoolBalances);

    if (userTotalPoolValue <= 0) {
      return toast.warn("You don't have any claims");
    }

    console.log(userPoolBalances);

    // Calculate User A's overall contribution percentage
    const userPoolPercentage = (userTotalPoolValue / totalPoolValue) * 100;
    const wallet = await kit.getAddress();

    dispatch(
      withdrawLP({
        summerizedAssets: userPoolBalances,
        senderPublicKey: wallet.address,
        userPoolPercentage,
      })
    );
  };

  const RedeemReward = async () => {
    const totalPoolValue = getTotalPoolValue(appLpBalances);
    const userTotalPoolValue = getTotalPoolValue(userPoolBalances);

    if (userTotalPoolValue <= 0) {
      return toast.warn("You don't have any claims");
    }

    // Calculate User A's overall contribution percentage
    const userPoolPercentage = (userTotalPoolValue / totalPoolValue) * 100;
    const wallet = await kit.getAddress();

    dispatch(
      redeemLPReward({
        userPoolPercentage,
        summerizedAssets: userPoolBalances,
        senderPublicKey: wallet.address,
      })
    );
  };

  return (
    <>
      <div className="flex flex-col gap-[7px] w-full">
        <div className="text-[14px]">JWLSOL is a SOL-pegged stablecoin.</div>
        <div className="text-[14px]">description</div>
      </div>

      <div className="flex flex-col gap-[21px] w-full mt-[21px]">
        {/* Native staking */}
        <div className="w-full bg-[rgb(18,18,18)] bg-[linear-gradient(rgba(255,255,255,0.05),rgba(255,255,255,0.05))] rounded-[4px]">
          <Accordion expanded={isNativeStakeExpanded}>
            <AccordionSummary
              id="panel1a-header"
              aria-controls="panel1a-content"
              className="w-full !cursor-default"
            >
              <div className="grid grid-cols-12 w-full text-[12.6px] px-[10.5px]">
                <div className="col-span-12 md:col-span-3 flex items-center md:px-[10.5px]">
                  <div className="flex items-center">
                    <div className="flex justify-center items-center w-[50px] h-[50px] mx-[7px]">
                      <img src={aquaLogo} alt="sol-logo" className="w-full" />
                    </div>
                    <div>AQUA</div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-2 flex flex-col justify-center md:px-[10.5px]">
                  <div>TVL</div>
                  <div>
                    1000
                    {/* {`${(
                    jwlsolSupply / LAMPORTS_PER_SOL
                  ).toLocaleString()} JWLSOL`} */}
                    total locked
                  </div>
                </div>

                <div className="col-span-12 md:col-span-1 md:px-[10.5px]"></div>

                <div className="col-span-12 md:col-span-3 flex items-center md:px-[10.5px]">
                  <div className="flex justify-between items-center w-full">
                    <div>Your balance</div>
                    <div className="text-end">
                      <div>
                        {/* {`${(
                        solBalance / LAMPORTS_PER_SOL
                      ).toLocaleString()} SOL`} */}
                        100 AQUA
                      </div>
                      <div>
                        200 JWLAQUA
                        {/* {`${(
                        jwlsolBalance / LAMPORTS_PER_SOL
                      ).toLocaleString()} JWLSOL`} */}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-1 md:px-[10.5px]"></div>

                <div className="col-span-12 md:col-span-2 flex items-center md:px-[10.5px]">
                  <button
                    className="flex justify-center items-center w-full p-[7px] border border-solid border-[rgba(84,245,183,0.6)] rounded-[5px]"
                    onClick={() =>
                      setIsNativeStakeExpanded(!isNativeStakeExpanded)
                    }
                  >
                    <span>Mint / Redeem</span>
                    {isNativeStakeExpanded ? (
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
                        disabled={isProcessing || isDepositingAqua}
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

                      <button
                        disabled={isProcessing || isDepositingAqua}
                        className="flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2"
                        onClick={handleDepositAqua}
                      >
                        {!isDepositingAqua ? (
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

                    {/* <div className="col-span-12 md:col-span-6 flex flex-col px-[10.5px] text-sm">
                      <div>{`Avail WHLAQUA Balance: ${Number(
                        whlAquaBalance
                      ).toFixed(2)} WHLAQUA`}</div>

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
                              setReserveRedeemAmount(Number(whlAquaBalance))
                            }
                          >
                            Max
                          </InputAdornment>
                        }
                        type="number"
                        placeholder="10.00"
                        value={
                          reserveRedeemAmount != null ? reserveRedeemAmount : ""
                        }
                        className="mt-[3.5px]"
                        onChange={(e) =>
                          setReserveRedeemAmount(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />

                      <button
                        // disabled={isProcessing || isReservingRedeem}
                        className="flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2"
                        // onClick={handleReserveRedeem}
                      >
                        {!isReservingRedeem ? (
                          <span>Redeem</span>
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
                    </div> */}
                  </div>
                </div>

                <div className="block md:hidden col-span-12 w-full italic px-[10.5px]">
                  If you have already requested JWLSOL to be redeemed, the new
                  redeem attempts will increase the unbonding epoch - you will
                  need to wait for the unbonding period again.
                </div>

                <div className="col-span-12 md:col-span-6">
                  <div className="grid grid-cols-12 gap-[10px] md:gap-0 w-full">
                    <div className="col-span-12 md:col-span-4 px-[10.5px]">
                      <div className="flex justify-start md:justify-center">
                        <div>SOL Reserved to Redeem</div>
                      </div>
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
                      <div className="flex justify-start md:justify-center">
                        <div>Unbonding Epoch</div>
                      </div>
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
                      <div className="flex justify-start md:justify-center">
                        <div>SOL Approved to Redeem</div>
                      </div>
                      <div className="flex justify-start md:justify-center mt-[5px] md:mt-[21px]">
                        <div>
                          {/* {userInfoAccountInfo &&
                            (
                              userInfoAccountInfo.approvedRedeemAmount.toNumber() /
                              LAMPORTS_PER_SOL
                            ).toLocaleString()} */}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden md:block col-span-12 mt-[14px]">
                  <div className="grid grid-cols-12 gap-[10px] md:gap-0 w-full">
                    <div className="col-span-3 px-[10.5px]"></div>
                    <div className="col-span-9 px-[10.5px] italic">
                      If you have already requested JWLSOL to be redeemed, the
                      new redeem attempts will increase the unbonding epoch -
                      you will need to wait for the unbonding period again.
                    </div>
                  </div>
                </div>
              </div>

              {/* lp section */}
              <div className="grid grid-cols-12 gap-[20px] md:gap-0 w-full mt-[14px]">
                <div className="col-span-12 md:col-span-6">
                  <div className="grid grid-cols-12 gap-[10px] md:gap-0 w-full">
                    <div className="col-span-12 md:col-span-6 flex flex-col px-[10.5px]">
                      <div>{`XLM ${Number(xlmBalance)?.toFixed(2)}`}</div>

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
                            onClick={handleSetXLMMaxDeposit}
                          >
                            Max
                          </InputAdornment>
                        }
                        type="number"
                        placeholder="0.00"
                        disabled={isProcessing || isDepositingAqua}
                        value={lqXlmAmount != null ? lqXlmAmount : ""}
                        className="mt-[3.5px]"
                        onChange={(e) =>
                          setXlmAmount(
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
                              setLqAquaAmount(Number(userAquaBalance))
                            }
                          >
                            Max
                          </InputAdornment>
                        }
                        type="number"
                        placeholder="10.00"
                        value={lqAquaAmount != null ? lqAquaAmount : ""}
                        className="mt-[3.5px]"
                        onChange={(e) =>
                          setLqAquaAmount(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />

                      <button
                        className="flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2"
                        onClick={handleProvideLiquidity}
                      >
                        {!isProviding ? (
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

                    <div className="grid grid-cols-12 gap-4">
                      {userPoolBalances &&
                        Object.values(userPoolBalances).map(
                          (asset: any, index) => (
                            <div
                              key={index}
                              className="col-span-12 md:col-span-6 flex flex-col mt-5"
                            >
                              <div className="col-span-12 bg-white shadow-md p-4 rounded-md">
                                <p className="text-sm font-bold text-gray-800">
                                  {asset.assetCode}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Total Amount: {asset.totalAmount}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  </div>

                  {/* <div className="grid grid-cols-12 gap-4 mt-5">
                    <div className="col-span-6 flex justify-center">
                      <button
                        onClick={withdrawLprovision}
                        className="flex justify-center items-center px-6 py-2 btn-primary2"
                      >
                        <span>Withdraw</span>
                      </button>
                    </div>

                    <div className="col-span-6 flex justify-center">
                      <button
                        onClick={RedeemReward}
                        className="flex justify-center items-center px-6 py-2 btn-primary2"
                      >
                        <span>Redeem Reward</span>
                      </button>
                    </div>
                  </div> */}
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
