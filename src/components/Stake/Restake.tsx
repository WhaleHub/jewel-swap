import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  InputAdornment,
  InputBase,
} from "@mui/material";
import { TailSpin } from "react-loader-spinner";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from "@mui/icons-material";
import { RootState } from "../../lib/store";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../lib/hooks";
import { toast } from "react-toastify";
import {
  FREIGHTER_ID,
  FreighterModule,
  LOBSTR_ID,
  LobstrModule,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import {
  getAccountInfo,
  lockingAqua,
  resetStateValues,
  restakeBlub,
  restaking,
  storeAccountBalance,
  unStakeAqua,
  unStakingAqua,
} from "../../lib/slices/userSlice";
import {
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  blubIssuerPublicKey,
  lpSignerPublicKey,
  blubIssuer,
  blubAssetCode,
} from "../../utils/constants";
import { StellarService } from "../../services/stellar.service";
import { Balance } from "../../utils/interfaces";

function Restake() {
  const [isBlubStakeExpanded, setIsBlubStakeExpanded] =
    useState<boolean>(false);
  const [blubStakeAmount, setBlubStakeAmount] = useState<number | null>(0);
  const dispatch = useAppDispatch();
  const [blubUnstakeAmount, setBlubUnstakeAmount] = useState<number | null>(0);

  const user = useSelector((state: RootState) => state.user);

  const whlAquaRecord = user?.userRecords?.balances?.find(
    (balance) => balance.asset_code === "WHLAQUA"
  );

  //get user aqua record
  const aquaRecord = user?.userRecords?.balances?.find(
    (balance) => balance.asset_code === "AQUA"
  );

  const userAquaBalance = aquaRecord?.balance;
  // const whlAquaBalance = whlAquaRecord?.balance;
  const blubBalance = whlAquaRecord?.balance;

  // Calculate accountClaimableRecords
  const accountClaimableRecords =
    user?.userRecords?.account?.claimableRecords
      ?.filter((record: any) => record.claimed === "UNCLAIMED")
      ?.reduce((total, record: any) => {
        return Number(total) + Number(record.amount);
      }, 0) || 0;

  const userPoolBalances =
    user?.userRecords?.account?.pools
      ?.filter((pool: any) => pool.claimed === "UNCLAIMED")
      ?.filter((pool: any) => pool.depositType === "LOCKER")
      ?.filter((pool: any) => pool.assetB.code === "AQUA")
      ?.reduce((total, record: any) => {
        return Number(total) + Number(record.assetBAmount);
      }, 0) || 0;

  // Add the two calculated values
  const poolAndClaimBalance =
    Number(userPoolBalances) + Number(accountClaimableRecords);

  const handleSetMaxDepositForBlub = () => {
    setBlubUnstakeAmount(Number(accountClaimableRecords));
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

  const handleSetRestakeMaxDeposit = () => {
    setBlubStakeAmount(Number(blubBalance));
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

    if (!existingTrustlines.includes(blubAssetCode)) return;

    try {
      const stakeAmount = blubStakeAmount.toFixed(7);

      const paymentOperation = Operation.payment({
        destination: lpSignerPublicKey,
        asset: new Asset(blubAssetCode, blubIssuer),
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
    if (user?.restaked) {
      updateWalletRecords();
      toast.success("BLUB Locked successfully!");
      dispatch(resetStateValues());
      dispatch(restaking(false));
    }

    if (user?.unStakedAqua) {
      updateWalletRecords();
      toast.success("Blub unstaked successfully!");
      dispatch(resetStateValues());
      dispatch(unStakingAqua(false));
    }
  }, [user?.restaked, user?.unStakedAqua]);

  return (
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
                        value={blubStakeAmount != null ? blubStakeAmount : ""}
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
                    value={blubUnstakeAmount != null ? blubUnstakeAmount : ""}
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
                        <span>Claim Earnings</span>
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
  );
}

export default Restake;
