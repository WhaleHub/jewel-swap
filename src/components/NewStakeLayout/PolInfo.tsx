import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import { useAppDispatch } from "../../lib/hooks";
import { fetchPolInfo } from "../../lib/slices/stakingSlice";
import { InformationCircleIcon } from "@heroicons/react/16/solid";

interface PolInfoProps {
  onDialogOpen: (msg: string, title: string) => void;
}

function PolInfo({ onDialogOpen }: PolInfoProps) {
  const dispatch = useAppDispatch();
  const staking = useSelector((state: RootState) => state.staking);
  const user = useSelector((state: RootState) => state.user);

  useEffect(() => {
    // Fetch POL info periodically
    dispatch(fetchPolInfo());
    const interval = setInterval(() => {
      dispatch(fetchPolInfo());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [dispatch]);

  const polData = staking.polInfo;

  return (
    <div className="bg-[#0E111BCC] p-6 rounded-[16px]">
      <div className="flex items-center space-x-2 mb-4">
        <div className="text-xl font-medium text-white">
          Protocol Owned Liquidity
        </div>
        <div className="relative group">
          <InformationCircleIcon
            className="h-[15px] w-[15px] text-white cursor-pointer"
            onClick={() =>
              onDialogOpen(
                "Protocol Owned Liquidity (POL) is created when 10% of staked AQUA is automatically added to the AQUA-BLUB liquidity pool. This generates fees for the protocol and ICE token holders receive voting power to direct these rewards.",
                "Protocol Owned Liquidity"
              )
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Total POL Value */}
        <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
          <div className="text-sm text-[#B1B3B8] mb-1">Total POL AQUA</div>
          <div className="text-lg font-semibold text-white">
            {polData?.totalAqua
              ? parseFloat(polData.totalAqua).toFixed(2)
              : "0.00"}
          </div>
        </div>

        <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
          <div className="text-sm text-[#B1B3B8] mb-1">Total POL BLUB</div>
          <div className="text-lg font-semibold text-white">
            {polData?.totalBlub
              ? parseFloat(polData.totalBlub).toFixed(2)
              : "0.00"}
          </div>
        </div>

        {/* LP Position */}
        <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
          <div className="text-sm text-[#B1B3B8] mb-1">LP Position</div>
          <div className="text-lg font-semibold text-white">
            {polData?.lpPosition
              ? parseFloat(polData.lpPosition).toFixed(2)
              : "0.00"}
          </div>
        </div>

        {/* Rewards Earned */}
        <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
          <div className="text-sm text-[#B1B3B8] mb-1">Rewards Earned</div>
          <div className="text-lg font-semibold text-[#00CC99]">
            {polData?.rewardsEarned
              ? parseFloat(polData.rewardsEarned).toFixed(2)
              : "0.00"}
          </div>
        </div>
      </div>

      {/* ICE Voting Power Section */}
      <div className="mt-4 bg-[#1A1E2E] p-4 rounded-[12px]">
        <div className="flex items-center space-x-2 mb-2">
          <div className="text-sm font-medium text-white">ICE Voting Power</div>
          <div className="relative group">
            <InformationCircleIcon
              className="h-[12px] w-[12px] text-white cursor-pointer"
              onClick={() =>
                onDialogOpen(
                  "ICE token holders can vote to direct POL rewards to different liquidity pools. Higher voting power means more influence over reward allocation.",
                  "ICE Voting Power"
                )
              }
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-[#B1B3B8]">Current Voting Target:</div>
          <div className="text-xs font-medium text-[#00CC99]">
            AQUA-BLUB Pool
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-[#B1B3B8]">Your Voting Power:</div>
          <div className="text-xs font-medium text-white">
            {polData?.iceVotingPower
              ? parseFloat(polData.iceVotingPower).toFixed(2)
              : "0.00"}
          </div>
        </div>
      </div>

      {/* Sync Status */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="text-[#B1B3B8]">
          Last updated:{" "}
          {staking.lastSyncTime
            ? new Date(staking.lastSyncTime).toLocaleTimeString()
            : "Never"}
        </div>
        <div className="flex items-center space-x-1">
          <div
            className={`w-2 h-2 rounded-full ${
              staking.syncStatus === "success"
                ? "bg-[#00CC99]"
                : staking.syncStatus === "syncing"
                ? "bg-yellow-500"
                : staking.syncStatus === "error"
                ? "bg-red-500"
                : "bg-gray-500"
            }`}
          />
          <span className="text-[#B1B3B8] capitalize">
            {staking.syncStatus}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PolInfo;
