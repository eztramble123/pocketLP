// Shared types for PocketLP Twin-Agent system

export interface TAPSignature {
  'Signature-Input': string;
  'Signature': string;
}

export interface AgentMessage {
  id: string;
  type: 'ROUND_UP_TRIGGER' | 'DEFI_DEPOSIT' | 'YIELD_UPDATE' | 'ERROR';
  timestamp: number;
  payload: any;
  agentId: string;
}

export interface RoundUpData {
  userId: string;
  transactionId: string;
  originalAmount: number;
  roundUpAmount: number;
  accumulatedTotal: number;
}

export interface DeFiOperation {
  operationId: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'SWAP';
  amount: number;
  token: string;
  lpPool?: string;
  expectedYield?: number;
}

export interface UserBalance {
  userId: string;
  totalRoundUps: number;
  totalDeposited: number;
  currentYield: number;
  lpPositions: LPPosition[];
}

export interface LPPosition {
  poolId: string;
  poolName: string;
  amount: number;
  apy: number;
  value: number;
}

export interface TAPRequestData {
  authority: string;
  path: string;
  method: string;
  keyId: string;
  nonce: string;
  tag: 'agent-browser-auth' | 'agent-payer-auth';
}

export interface AgentConfig {
  tapAgent: {
    keyId: string;
    privateKey: string;
    baseUrl: string;
  };
  defiAgent: {
    solanaRpc: string;
    walletProvider: string;
    network: 'devnet' | 'mainnet';
  };
  redis: {
    url: string;
  };
  database: {
    url: string;
  };
}