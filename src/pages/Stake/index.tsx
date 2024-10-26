import React from "react";
import { Link, useParams } from "react-router-dom";
import { tokensRegistered } from "../../data";
import solLogo from "../../assets/images/sol_logo.png";
import aquaLogo from "../../assets/images/aqua_logo.png";
import AquaStake from "../../components/Stake/AquaStake";

const Stake = () => {
  const { tokenId } = useParams();

  return (
    <div className="flex justify-center w-full mt-[56px] md:mt-[40px] px-[10.5px]">
      <div className="flex flex-col w-full max-w-[1320px] bg-[#0f1720] rounded-[12px] p-[30px_20px] md:p-[30px]">
        <div className="flex justify-between items-center w-full">
          <h1 className="text-[31.5px] md:text-[35px] text-white font-normal">
            Stake
          </h1>

          <div className="flex justify-center items-center w-[62px] md:w-[72px] h-[62px] md:h-[72px] border border-solid border-[#808080] rounded-[15px] p-[10px]">
            <div className="flex justify-center items-center w-[40px] md:w-[50px] h-[40px] md:h-[50px]">
              <img
                src={tokenId === "sol" ? solLogo : aquaLogo}
                alt={tokenId === "sol" ? "sol-logo" : "aqua-logo"}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[14px] mt-[3.5px] mb-[21px]">
          <div className="flex justify-center items-center text-[17px]">
            Token:
          </div>

          <div className="flex justify-center items-center gap-[14px]">
            {tokensRegistered.map((item, index) => {
              return (
                <Link
                  key={index}
                  to={`/stake/${item.toLowerCase()}`}
                  className={`flex justify-center items-center p-[5px_10px] rounded-[10px] border border-solid border-[rgba(84,245,183,.6)] ${
                    tokenId == item.toLowerCase()
                      ? "bg-[rgba(16,197,207,.6)]"
                      : "bg-none"
                  }`}
                >
                  {item.toUpperCase()}
                </Link>
              );
            })}
          </div>
        </div>

        {tokenId == "aqua" && <AquaStake />}
      </div>
    </div>
  );
};

export default Stake;
