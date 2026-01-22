import { InformationCircleIcon } from "@heroicons/react/16/solid";

function Vote() {
  return (
    <div className="flex justify-center w-full mt-[56px] md:mt-[40px] px-[10.5px]">
      <div className="flex flex-col w-full max-w-[1320px] bg-[#0f1720] rounded-[12px] p-[30px_20px] md:p-[30px]">
        <div className="text-center">
          <h1 className="text-[31.5px] md:text-[35px] text-white font-normal mb-4">
            Governance Coming Soon
          </h1>
          <p className="text-[#B1B3B8] mb-6">
            ICE token governance and voting features are coming soon.
          </p>

          <div className="bg-[#1A1E2E] p-6 rounded-[12px] max-w-[600px] mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <InformationCircleIcon className="h-[20px] w-[20px] text-[#00CC99]" />
              <h3 className="text-white font-medium">What to Expect</h3>
            </div>
            <ul className="text-[#B1B3B8] text-sm space-y-2 text-left">
              <li>- Vote on protocol decisions with ICE tokens</li>
              <li>- Direct Protocol Owned Liquidity rewards to your favorite pools</li>
              <li>- Participate in governance proposals</li>
              <li>- Earn additional rewards for active participation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Vote;
