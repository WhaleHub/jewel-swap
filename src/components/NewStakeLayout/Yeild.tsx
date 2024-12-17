import clsx from "clsx";
import { Button, Input } from "@headlessui/react";

function Yeild() {
  return (
    <div>
      <div className="max-w-[912px] mx-auto">
        <div className="text-white text-4xl-custom1 font-medium text-center">
          Make Smart Yield Decisions to Maximize Returns
        </div>
        <div className="text-[#B1B3B8] text-base font-normal text-center">
          Stay ahead of the curve with rewards designed to keep you competitive
          and thriving.
        </div>
      </div>
      <div className="mt-10 grid gap-5 grid-cols-2 mb-10">
        <div>
          <div className="bg-[#0E111BCC] p-10 rounded-[16px] space-y-10">
            <div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <img
                    src={"/Blub_logo2.svg"}
                    alt="Aqua"
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-lg">BLUB</span>
                </div>
              </div>
              <div className="text-2xl font-medium text-white mt-5 flex items-center space-x-2">
                <div>Manage your earnings</div>
                <i className="fa fa-exclamation-circle" aria-hidden="true"></i>
              </div>

              <div className="flex items-center bg-[#0E111B] px-5 py-2 space-x-2 mt-2 rounded-[8px]">
                <Input
                  placeholder="0 AQUA"
                  className={clsx(
                    "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
                    "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-[#3C404D]",
                    "w-full p-3 bg-none"
                  )}
                />
                <button className="bg-[#3C404D] p-2 rounded-[4px]">Max</button>
              </div>

              <div className="flex items-center text-normal mt-6 space-x-1">
                <div className="font-normal text-[#B1B3B8]">
                  Staked Balance:
                </div>
                <div className="font-medium">0 BLUB</div>
              </div>

              <Button className="rounded-[12px] py-5 px-4 text-white mt-10 w-full bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] text-base font-semibold">
                Unstake
              </Button>
            </div>

            <hr className="border-[1px] border-solid border-[#3C404D]" />

            <div>
              <div className="flex items-center bg-[#0E111B] px-5 py-2 space-x-2 mt-2 rounded-[8px]">
                <Input
                  placeholder="0 AQUA"
                  className={clsx(
                    "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
                    "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-[#3C404D]",
                    "w-full p-3 bg-none"
                  )}
                />
                <button className="bg-[#3C404D] p-2 rounded-[4px]">Max</button>
              </div>

              <div className="flex items-center text-normal mt-6 space-x-1">
                <div className="font-normal text-[#B1B3B8]">
                  Unstaked Balance::
                </div>
                <div className="font-medium">0 BLUB</div>
              </div>

              <Button className="rounded-[12px] py-5 px-4 text-white mt-10 w-full bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] text-base font-semibold">
                Unstake
              </Button>
            </div>
          </div>
        </div>
        <div>
          <div className="bg-[#0E111BCC] p-10 rounded-[16px]">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  src={"/Blub_logo2.svg"}
                  alt="Aqua"
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-lg">BLUB</span>
              </div>
            </div>
            <div className="text-2xl font-medium text-white mt-5 flex items-center space-x-2">
              <div>Boost liquidity pool for yield</div>
              <i className="fa fa-exclamation-circle" aria-hidden="true"></i>
            </div>

            <div className="flex items-center bg-[#0E111B] px-5 py-2 space-x-2 mt-2 rounded-[8px]">
              <Input
                placeholder="0 AQUA"
                className={clsx(
                  "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
                  "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-[#3C404D]",
                  "w-full p-3 bg-none"
                )}
              />
              <button className="bg-[#3C404D] p-2 rounded-[4px]">Max</button>
            </div>
            <div className="flex items-center text-normal mt-2 space-x-1">
              <div className="font-normal text-[#B1B3B8]">Balance:</div>
              <div className="font-medium">0 BLUB</div>
            </div>

            <div className="flex items-center bg-[#0E111B] px-5 py-2 space-x-2 mt-5 rounded-[8px]">
              <Input
                placeholder="0 AQUA"
                className={clsx(
                  "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
                  "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-[#3C404D]",
                  "w-full p-3 bg-none"
                )}
              />
              <button className="bg-[#3C404D] p-2 rounded-[4px]">Max</button>
            </div>
            <div className="flex items-center text-normal mt-2 space-x-1">
              <div className="font-normal text-[#B1B3B8]">Balance:</div>
              <div className="font-medium">0 BLUB</div>
            </div>

            <Button className="rounded-[12px] py-5 px-4 text-white mt-10 w-full bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] text-base font-semibold">
              Lock for Yeild
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Yeild;
