import {
  SorobanRpc,
  Address,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  xdr,
  scValToNative,
  nativeToScVal,
} from '@stellar/stellar-sdk';

// Contract configuration
interface ContractConfig {
  stakingContract: string;
  governanceContract: string;
  rewardsContract: string;
  liquidityContract: string;
  network: string;
  rpcUrl: string;
}

// Contract call result interface
export interface ContractCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionHash?: string;
  ledger?: number;
}

// Transaction options
interface TransactionOptions {
  fee?: string;
  timeout?: number;
  simulate?: boolean;
}

export class SorobanService {
  private server: SorobanRpc.Server;
  private contractConfig: ContractConfig;

  constructor() {
    this.contractConfig = {
      stakingContract: process.env.REACT_APP_STAKING_CONTRACT_ID || 
        'CCTOX3DR5EGTYSH3CH74YPHNBQ2BBYKQTUVV5NPPXJGGCAIF277BBHIX',
      governanceContract: process.env.REACT_APP_GOVERNANCE_CONTRACT_ID || 
        'CASNQHCB75PEZU5BX2BZK3SN4WKE3UAPSJPM6WAR7DLPLDBUMZFUHOBA',
      rewardsContract: process.env.REACT_APP_REWARDS_CONTRACT_ID || 
        'CDV5SQKDPAXMWNCX7ZQRW2W7JQ6JUKJ7PQJTLRWL6JLWVLZLVZ7LZLZ3',
      liquidityContract: process.env.REACT_APP_LIQUIDITY_CONTRACT_ID || 
        'CDV5SQKDPAXMWNCX7ZQRW2W7JQ6JUKJ7PQJTLRWL6JLWVLZLVZ7LZLZ4',
      network: process.env.REACT_APP_STELLAR_NETWORK || 'testnet',
      rpcUrl: process.env.REACT_APP_SOROBAN_RPC_URL || 
        'https://soroban-testnet.stellar.org',
    };

    this.server = new SorobanRpc.Server(this.contractConfig.rpcUrl);
    console.log('🔗 [SorobanService] Initialized with config:', this.contractConfig);
  }

  /**
   * Get contract instance for a specific contract type
   */
  getContract(contractType: 'staking' | 'governance' | 'rewards' | 'liquidity'): Contract {
    const contractId = this.getContractId(contractType);
    return new Contract(contractId);
  }

  /**
   * Get contract ID for a specific contract type
   */
  getContractId(contractType: 'staking' | 'governance' | 'rewards' | 'liquidity'): string {
    switch (contractType) {
      case 'staking':
        return this.contractConfig.stakingContract;
      case 'governance':
        return this.contractConfig.governanceContract;
      case 'rewards':
        return this.contractConfig.rewardsContract;
      case 'liquidity':
        return this.contractConfig.liquidityContract;
      default:
        throw new Error(`Unknown contract type: ${contractType}`);
    }
  }

  /**
   * Simulate a contract method call
   */
  async simulateContract<T = any>(
    contractType: 'staking' | 'governance' | 'rewards' | 'liquidity',
    method: string,
    args: any[] = [],
    userKeypair?: Keypair,
  ): Promise<ContractCallResult<T>> {
    try {
      const contract = this.getContract(contractType);
      const publicKey = userKeypair?.publicKey() || Keypair.random().publicKey();
      const sourceAccount = await this.server.getAccount(publicKey);
      
      // Build the contract call operation
      const operation = contract.call(method, ...args.map(arg => this.convertToScVal(arg)));
      
      // Build transaction
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate the transaction
      const simulationResponse = await this.server.simulateTransaction(transaction);
      
      if (SorobanRpc.Api.isSimulationError(simulationResponse)) {
        const error = `Simulation failed: ${simulationResponse.error}`;
        console.error('❌ [SorobanService] Simulation error:', error);
        return { success: false, error };
      }

      const result = simulationResponse.result?.retval 
        ? scValToNative(simulationResponse.result.retval)
        : null;
      console.log('✅ [SorobanService] Simulation successful:', { contractType, method, result });
      
      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ [SorobanService] Simulation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a contract method call
   */
  async callContract<T = any>(
    contractType: 'staking' | 'governance' | 'rewards' | 'liquidity',
    method: string,
    args: any[] = [],
    userKeypair: Keypair,
    options: TransactionOptions = {},
  ): Promise<ContractCallResult<T>> {
    try {
      const contract = this.getContract(contractType);
      const sourceAccount = await this.server.getAccount(userKeypair.publicKey());
      
      // Build the contract call operation
      const operation = contract.call(method, ...args.map(arg => this.convertToScVal(arg)));
      
      // Build transaction
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: options.fee || '100000',
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(operation)
        .setTimeout(options.timeout || 30)
        .build();

      // Simulate first if not explicitly disabled
      if (options.simulate !== false) {
        const simulationResponse = await this.server.simulateTransaction(transaction);
        if (SorobanRpc.Api.isSimulationError(simulationResponse)) {
          return { success: false, error: `Simulation failed: ${simulationResponse.error}` };
        }
      }

      // Sign and submit transaction
      transaction.sign(userKeypair);
      const submitResponse = await this.server.sendTransaction(transaction);
      
      if (submitResponse.status === 'PENDING') {
        // Wait for transaction to be confirmed
        let getResponse = await this.server.getTransaction(submitResponse.hash);
        let attempts = 0;
        const maxAttempts = 10;
        
        while (getResponse.status === 'NOT_FOUND' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          getResponse = await this.server.getTransaction(submitResponse.hash);
          attempts++;
        }

                 if (getResponse.status === 'SUCCESS') {
           const result = getResponse.returnValue 
             ? scValToNative(getResponse.returnValue)
             : null;
           console.log('✅ [SorobanService] Transaction successful:', {
             contractType,
             method,
             hash: submitResponse.hash,
             result,
           });
          
          return {
            success: true,
            data: result,
            transactionHash: submitResponse.hash,
            ledger: getResponse.ledger,
          };
        } else {
          const error = `Transaction failed: ${getResponse.status}`;
          console.error('❌ [SorobanService] Transaction failed:', error);
          return { success: false, error };
        }
      } else {
        const error = `Transaction submission failed: ${submitResponse.status}`;
        console.error('❌ [SorobanService] Submission failed:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      console.error('❌ [SorobanService] Contract call failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get account information
   */
  async getAccount(publicKey: string): Promise<any> {
    try {
      console.log('🔍 [SorobanService] Loading account:', publicKey);
      const account = await this.server.getAccount(publicKey);
      return account;
    } catch (error: any) {
      console.error('❌ [SorobanService] Failed to load account:', error);
      throw error;
    }
  }

  /**
   * Get latest ledger information
   */
  async getLatestLedger(): Promise<any> {
    try {
      const ledger = await this.server.getLatestLedger();
      return ledger;
    } catch (error: any) {
      console.error('❌ [SorobanService] Failed to get latest ledger:', error);
      throw error;
    }
  }

  /**
   * Health check for Soroban RPC connection
   */
  async healthCheck(): Promise<{ success: boolean; latency?: number; error?: string }> {
    try {
      const startTime = Date.now();
      await this.server.getLatestLedger();
      const latency = Date.now() - startTime;
      
      console.log('✅ [SorobanService] Health check passed:', { latency });
      return { success: true, latency };
    } catch (error: any) {
      console.error('❌ [SorobanService] Health check failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert JavaScript value to ScVal
   */
  private convertToScVal(value: any): any {
    if (typeof value === 'string') {
      return nativeToScVal(value, { type: 'symbol' });
    } else if (typeof value === 'number') {
      return nativeToScVal(value, { type: 'i64' });
    } else if (typeof value === 'boolean') {
      return nativeToScVal(value, { type: 'bool' });
    } else if (Array.isArray(value)) {
      return nativeToScVal(value, { type: 'vec' });
    } else {
      return nativeToScVal(value);
    }
  }

  /**
   * Get current network passphrase
   */
  private getNetworkPassphrase(): string {
    return this.contractConfig.network === 'mainnet' 
      ? Networks.PUBLIC 
      : Networks.TESTNET;
  }

  /**
   * Get contract configuration
   */
  getConfig(): ContractConfig {
    return this.contractConfig;
  }

  /**
   * Get RPC server instance
   */
  getServer(): SorobanRpc.Server {
    return this.server;
  }
}

// Export singleton instance
export const sorobanService = new SorobanService(); 