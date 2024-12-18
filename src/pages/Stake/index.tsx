import { useParams } from "react-router-dom";
import NewStakelayout from "../../components/NewStakeLayout/Stake";
import { Button } from "@headlessui/react";

const Stake = () => {
  const { tokenId } = useParams();

  return (
    <div className="w-full mt-[56px] md:mt-[64px] px-[10.5px]">
      <div className=" w-full">{tokenId == "aqua" && <NewStakelayout />}</div>
      <div className="justify-between max-w-[1280px] mx-auto grid grid-cols-2 space-x-6 my-20 hidden">
        <div className="px-6 py-6 bg-[#2B3553] rounded-[15px]">
          <div className="flex h-20 w-20 rounded-full bg-[#151A29] items-center justify-center">
            <img
              className="inline-block size-10 rounded-full"
              src={"/discord_icon.svg"}
              alt="Discord"
            />
          </div>

          <div className="div text-2xl font-medium">Join us on Discord</div>

          <Button
            className={
              "mt-5 text-base font-semibold bg-[white] text-[#151A29] px-5 py-3 rounded-2xl"
            }
          >
            Join Discord
          </Button>
        </div>

        <div className="px-6 py-6 bg-[#173A59] rounded-[15px]">
          <div className="flex h-20 w-20 rounded-full bg-[#151A29] items-center justify-center">
            <img
              className="inline-block size-10 rounded-full"
              src={"/x_icon.svg"}
              alt="Twitter(X)"
            />
          </div>

          <div className="div text-2xl font-medium">
            Follow us on Twitter(X)
          </div>

          <Button
            className={
              "mt-5 text-base font-semibold bg-[white] text-[#151A29] px-5 py-3 rounded-2xl"
            }
          >
            Follow on Twitter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Stake;
