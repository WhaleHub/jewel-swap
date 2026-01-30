import { useParams } from "react-router-dom";
import NewStakelayout from "../../components/NewStakeLayout/Stake";
import { Button } from "@headlessui/react";

const Stake = () => {
  const { tokenId } = useParams();

  return (
    <div className="w-full mt-[56px] md:mt-[64px] px-[10.5px]">
      <div className=" w-full">{tokenId == "aqua" && <NewStakelayout />}</div>
      <div className="justify-items-center max-w-[1280px] mx-auto flex flex-col items-center gap-4 my-20">
        <div className="px-6 py-6 bg-[#2B3553] rounded-[15px] hidden">
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

        <Button
          className="px-6 py-6 bg-[#173A59] rounded-[15px] flex flex-row items-center justify-between gap-3 md:w-[600px] transition-transform duration-200 hover:scale-100 scale-95"
          as="a"
          href="https://twitter.com/whalehubdefi"
          target="_blank"
        >
          <div className="flex px-2.5 py-2 rounded-2xl bg-[#ffffff] items-center justify-center">
            <img
              className="inline-block size-10 rounded-full"
              src={"/x-icon.webp"}
              alt="Twitter(X)"
            />
          </div>

          <div className="div text-2xl font-medium xs:my-3 sm:my-0">
            Follow us on X
          </div>

          <div className="text-base font-semibold bg-[white] text-[#151A29] px-5 py-3 rounded-2xl">
            Follow
          </div>
        </Button>

        <Button
          className="px-6 py-6 bg-[#2D3259] rounded-[15px] flex flex-row items-center justify-between gap-3 md:w-[600px] transition-transform duration-200 hover:scale-100 scale-95"
          as="a"
          href="https://discord.gg/fXmh8Y3cFn"
          target="_blank"
        >
          <div className="flex px-2.5 py-2 rounded-2xl bg-[#5865F2] items-center justify-center">
            <img
              className="inline-block size-10"
              src={"/discord_icon.svg"}
              alt="Discord"
            />
          </div>

          <div className="div text-2xl font-medium xs:my-3 sm:my-0">
            Join us on Discord
          </div>

          <div className="text-base font-semibold bg-[#5865F2] text-white px-5 py-3 rounded-2xl">
            Join
          </div>
        </Button>

        <Button
          className="px-6 py-6 bg-[#1A3A4A] rounded-[15px] flex flex-row items-center justify-between gap-3 md:w-[600px] transition-transform duration-200 hover:scale-100 scale-95"
          as="a"
          href="https://t.me/whalehubdefi"
          target="_blank"
        >
          <div className="flex px-2.5 py-2 rounded-2xl bg-[#26A5E4] items-center justify-center">
            <img
              className="inline-block size-10"
              src={"/telegram_icon.svg"}
              alt="Telegram"
            />
          </div>

          <div className="div text-2xl font-medium xs:my-3 sm:my-0">
            Join us on Telegram
          </div>

          <div className="text-base font-semibold bg-[#26A5E4] text-white px-5 py-3 rounded-2xl">
            Join
          </div>
        </Button>
      </div>
    </div>
  );
};

export default Stake;
