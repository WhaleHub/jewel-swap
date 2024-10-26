import React from "react";

type Vote = {
  pool: string;
  tvl: number;
  rewardsApy: string;
};

function Vote() {
  return (
    <div className="flex justify-center w-full mt-[56px] md:mt-[40px] px-[10.5px]">
      <div className="flex flex-col w-full max-w-[1320px] bg-[#0f1720] rounded-[12px] p-[30px_20px] md:p-[30px]">
        <div className="flex justify-between items-center w-full">
          <h1 className="text-[31.5px] md:text-[35px] text-white font-normal">
            Vote For Your Favorite Markets
          </h1>

          {/* <div className="flex justify-center items-center w-[62px] md:w-[72px] h-[62px] md:h-[72px] border border-solid border-[#808080] rounded-[15px] p-[10px]">
          <div className="flex justify-center items-center w-[40px] md:w-[50px] h-[40px] md:h-[50px]">
            <img
              src={tokenId === "sol" ? solLogo : aquaLogo}
              alt={tokenId === "sol" ? "sol-logo" : "aqua-logo"}
              className="w-full"
            />
          </div>
        </div> */}
        </div>

        <div className="flex items-center gap-[14px] mt-[3.5px] mb-[21px]">
          <div className="flex justify-center items-center gap-[14px]">
            samuel
          </div>
        </div>

        {/* {tokenId == "aqua" && <AquaStake />} */}
      </div>
    </div>
  );
}

export default Vote;
