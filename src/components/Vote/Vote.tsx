import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../lib/store';
import { useAppDispatch } from '../../lib/hooks';
import { fetchGovernanceStats, fetchUserGovernance } from '../../lib/slices/governanceSlice';
import { InformationCircleIcon } from '@heroicons/react/16/solid';
import { isFeatureEnabled } from '../../config/soroban.config';

type Pool = {
  id: string;
  name: string;
  assets: string[];
  currentVotes: string;
  rewardsApy: string;
  polAllocation: string;
};

function Vote() {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user);
  const governance = useSelector((state: RootState) => state.governance);
  const [selectedPool, setSelectedPool] = useState<string>('aqua-blub');

  // Mock pool data - in production this would come from API
  const pools: Pool[] = [
    {
      id: 'aqua-blub',
      name: 'AQUA-BLUB',
      assets: ['AQUA', 'BLUB'],
      currentVotes: governance.globalStats?.polVotingAllocation || '0',
      rewardsApy: '12.5%',
      polAllocation: '85%',
    },
    {
      id: 'aqua-usdc',
      name: 'AQUA-USDC',
      assets: ['AQUA', 'USDC'],
      currentVotes: '0',
      rewardsApy: '8.2%',
      polAllocation: '10%',
    },
    {
      id: 'aqua-xlm',
      name: 'AQUA-XLM',
      assets: ['AQUA', 'XLM'],
      currentVotes: '0',
      rewardsApy: '6.7%',
      polAllocation: '5%',
    },
  ];

  useEffect(() => {
    if (user.userWalletAddress && isFeatureEnabled('useSoroban')) {
      dispatch(fetchUserGovernance(user.userWalletAddress));
      dispatch(fetchGovernanceStats());
    }
  }, [user.userWalletAddress, dispatch]);

  const handleVote = (poolId: string) => {
    if (!user.userWalletAddress) {
      alert('Please connect your wallet to vote');
      return;
    }

    if (parseFloat(governance.votingPower) === 0) {
      alert('You need ICE tokens to vote. Stake AQUA with a lock period to earn ICE tokens.');
      return;
    }

    setSelectedPool(poolId);
    // In production, this would trigger a smart contract call
    console.log(`Voting for pool ${poolId} with ${governance.votingPower} voting power`);
  };

  if (!isFeatureEnabled('useSoroban')) {
    return (
      <div className="flex justify-center w-full mt-[56px] md:mt-[40px] px-[10.5px]">
        <div className="flex flex-col w-full max-w-[1320px] bg-[#0f1720] rounded-[12px] p-[30px_20px] md:p-[30px]">
          <div className="text-center">
            <h1 className="text-[31.5px] md:text-[35px] text-white font-normal mb-4">
              Governance Coming Soon
            </h1>
            <p className="text-[#B1B3B8]">
              Enable Soroban features to access ICE token governance and voting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full mt-[56px] md:mt-[40px] px-[10.5px]">
      <div className="flex flex-col w-full max-w-[1320px] bg-[#0f1720] rounded-[12px] p-[30px_20px] md:p-[30px]">
        <div className="flex justify-between items-center w-full mb-6">
          <div>
            <h1 className="text-[31.5px] md:text-[35px] text-white font-normal">
              Vote For Your Favorite Markets
            </h1>
            <p className="text-[#B1B3B8] mt-2">
              Use your ICE tokens to direct Protocol Owned Liquidity rewards
            </p>
          </div>
        </div>

        {/* User Governance Stats */}
        {user.userWalletAddress && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
              <div className="flex items-center space-x-2 mb-2">
                <div className="text-sm text-[#B1B3B8]">ICE Balance</div>
                <InformationCircleIcon className="h-[12px] w-[12px] text-[#B1B3B8]" />
              </div>
              <div className="text-xl font-semibold text-white">
                {parseFloat(governance.iceBalance).toFixed(2)} ICE
              </div>
            </div>
            
            <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
              <div className="flex items-center space-x-2 mb-2">
                <div className="text-sm text-[#B1B3B8]">Voting Power</div>
                <InformationCircleIcon className="h-[12px] w-[12px] text-[#B1B3B8]" />
              </div>
              <div className="text-xl font-semibold text-[#00CC99]">
                {parseFloat(governance.votingPower).toFixed(2)}
              </div>
            </div>
            
            <div className="bg-[#1A1E2E] p-4 rounded-[12px]">
              <div className="flex items-center space-x-2 mb-2">
                <div className="text-sm text-[#B1B3B8]">Lock Duration</div>
                <InformationCircleIcon className="h-[12px] w-[12px] text-[#B1B3B8]" />
              </div>
              <div className="text-xl font-semibold text-white">
                {governance.userGovernance?.lockDuration || 0} days
              </div>
            </div>
          </div>
        )}

        {/* Voting Pools */}
        <div className="space-y-4">
          <h2 className="text-xl font-medium text-white mb-4">Available Pools</h2>
          
          {pools.map((pool) => (
            <div key={pool.id} className="bg-[#1A1E2E] p-6 rounded-[12px]">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{pool.name}</h3>
                    <div className="flex space-x-2">
                      {pool.assets.map((asset) => (
                        <span key={asset} className="bg-[#2A2E3E] px-2 py-1 rounded-[6px] text-xs text-[#B1B3B8]">
                          {asset}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-[#B1B3B8]">Current Votes</div>
                      <div className="text-white font-medium">{pool.currentVotes}</div>
                    </div>
                    <div>
                      <div className="text-[#B1B3B8]">Rewards APY</div>
                      <div className="text-[#00CC99] font-medium">{pool.rewardsApy}</div>
                    </div>
                    <div>
                      <div className="text-[#B1B3B8]">POL Allocation</div>
                      <div className="text-white font-medium">{pool.polAllocation}</div>
                    </div>
                  </div>
                </div>
                
                <div className="ml-6">
                  <button
                    className={`px-6 py-2 rounded-[8px] font-medium transition-colors ${
                      selectedPool === pool.id
                        ? 'bg-[#00CC99] text-white'
                        : 'bg-[#3C404D] text-[#B1B3B8] hover:bg-[#4A4E5D]'
                    } ${
                      parseFloat(governance.votingPower) === 0 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'cursor-pointer'
                    }`}
                    onClick={() => handleVote(pool.id)}
                    disabled={parseFloat(governance.votingPower) === 0}
                  >
                    {selectedPool === pool.id ? 'Voting' : 'Vote'}
                  </button>
                </div>
              </div>
              
              {/* Voting Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-[#B1B3B8] mb-1">
                  <span>Voting Share</span>
                  <span>{pool.polAllocation}</span>
                </div>
                <div className="w-full bg-[#2A2E3E] rounded-full h-2">
                  <div 
                    className="bg-[#00CC99] h-2 rounded-full transition-all duration-300"
                    style={{ width: pool.polAllocation }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* How to Get Voting Power */}
        {parseFloat(governance.votingPower) === 0 && user.userWalletAddress && (
          <div className="mt-8 bg-[#2A2E3E] p-6 rounded-[12px] border border-[#3C404D]">
            <div className="flex items-center space-x-2 mb-3">
              <InformationCircleIcon className="h-[16px] w-[16px] text-[#00CC99]" />
              <h3 className="text-white font-medium">How to Get Voting Power</h3>
            </div>
            <p className="text-[#B1B3B8] text-sm mb-3">
              To participate in governance, you need ICE tokens. Here's how to get them:
            </p>
            <ol className="text-[#B1B3B8] text-sm space-y-1 ml-4">
              <li>1. Stake AQUA tokens with a lock period (minimum 30 days)</li>
              <li>2. Receive ICE tokens based on the amount and duration of your lock</li>
              <li>3. Use ICE tokens to vote and direct Protocol Owned Liquidity rewards</li>
              <li>4. Longer lock periods = more ICE tokens = more voting power</li>
            </ol>
          </div>
        )}

        {/* Global Governance Stats */}
        {governance.globalStats && (
          <div className="mt-8 bg-[#1A1E2E] p-6 rounded-[12px]">
            <h3 className="text-white font-medium mb-4">Global Governance Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-[#B1B3B8]">Total ICE Supply</div>
                <div className="text-white font-medium">
                  {parseFloat(governance.globalStats.totalIceSupply).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[#B1B3B8]">Total Voting Power</div>
                <div className="text-white font-medium">
                  {parseFloat(governance.globalStats.totalVotingPower).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[#B1B3B8]">Total Participants</div>
                <div className="text-white font-medium">
                  {governance.globalStats.totalParticipants}
                </div>
              </div>
              <div>
                <div className="text-[#B1B3B8]">POL Allocation</div>
                <div className="text-[#00CC99] font-medium">
                  {parseFloat(governance.globalStats.polVotingAllocation).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Vote;
