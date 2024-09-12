import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  InputAdornment,
  InputBase,
  LinearProgress,
} from "@mui/material";
import React, { useState } from "react";
import Swiper from "react-id-swiper";
import { convertSecondsToDateTime } from "../../utils";
import { IEpochInfo } from "../../interfaces";
import { wlValidators } from "../../data";
import aquaLogo from "../../assets/images/aqua_logo.png";
import { TailSpin } from "react-loader-spinner";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from "@mui/icons-material";

function AquaStake() {
  const [epochInfo, setEpochInfo] = useState<IEpochInfo>();
  const [isNativeStakeExpanded, setIsNativeStakeExpanded] =
    useState<boolean>(false);
  const [solDepositAmount, setSolDepositAmount] = useState<number | null>();

  const handleSetMaxDeposit = () => {};

  return (
    <>
      <div className="flex flex-col gap-[7px] w-full">
        <div className="text-[14px]">JWLSOL is a SOL-pegged stablecoin.</div>
        <div className="text-[14px]">
          Mint SOL for JWLSOL 1:1 which will be sent for validator staking when
          able to. A dynamic % will be sent for LP creation. Stake JWLSOL for
          SJWLSOL which will accrue staking yield. You can now swap SOL-JWLSOL
          at Orca.
        </div>
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
                    <div>SOL</div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-2 flex flex-col justify-center md:px-[10.5px]">
                  <div>TVL</div>
                  <div>
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
                      <div>
                        {/* {`Avail SOL Balance:  1000
                      ${(
                        solBalance / LAMPORTS_PER_SOL
                      ).toLocaleString()} SOL`} */}
                        1000 AQUA
                      </div>

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
                        // disabled={isProcessing || isDepositingSol}
                        // value={solDepositAmount != null ? solDepositAmount : ""}
                        className="mt-[3.5px]"
                        onChange={(e) =>
                          setSolDepositAmount(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />

                      <button
                        // disabled={isProcessing || isDepositingSol}
                        className="flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2"
                        // onClick={handleDepositSol}
                      >
                        {/* {!isDepositingSol ? (
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
                        )} */}
                      </button>
                    </div>

                    <div className="col-span-12 md:col-span-6 flex flex-col px-[10.5px]">
                      <div>{`Avail JWLSOL Balance: 2000 JWLAQUA`}</div>

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
                            // onClick={() =>
                            //   setReserveRedeemAmount(
                            //     jwlsolBalance / LAMPORTS_PER_SOL
                            //   )
                            // }
                          >
                            Max
                          </InputAdornment>
                        }
                        type="number"
                        placeholder="0.00"
                        // value={
                        //   reserveRedeemAmount != null ? reserveRedeemAmount : ""
                        // }
                        className="mt-[3.5px]"
                        // onChange={(e) =>
                        //   setReserveRedeemAmount(
                        //     e.target.value ? Number(e.target.value) : null
                        //   )
                        // }
                      />

                      <button
                        // disabled={isProcessing || isReservingRedeem}
                        className="flex justify-center items-center w-fit p-[7px_21px] mt-[7px] btn-primary2"
                        // onClick={handleReserveRedeem}
                      >
                        {/* {!isReservingRedeem ? (
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
                        )} */}
                      </button>
                    </div>
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
            </AccordionDetails>
          </Accordion>
        </div>
      </div>
    </>
  );
}

export default AquaStake;
