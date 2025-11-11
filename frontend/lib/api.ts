import axios from 'axios';

const TAP_AGENT_URL = process.env.NEXT_PUBLIC_TAP_AGENT_URL || 'http://localhost:4001';
const DEFI_AGENT_URL = process.env.NEXT_PUBLIC_DEFI_AGENT_URL || 'http://localhost:4002';

const tapApi = axios.create({
  baseURL: `${TAP_AGENT_URL}/api/tap`,
  timeout: 10000,
});

const defiApi = axios.create({
  baseURL: `${DEFI_AGENT_URL}/api/defi`,
  timeout: 10000,
});

// TAP Agent API calls
export const tapAgent = {
  async signRequest(data: {
    authority: string;
    path: string;
    tag: 'agent-browser-auth' | 'agent-payer-auth';
  }) {
    const response = await tapApi.post('/sign', data);
    return response.data;
  },

  async processPurchase(data: {
    userId: string;
    amount: number;
    merchantUrl: string;
    merchantPath?: string;
  }) {
    const response = await tapApi.post('/purchase', data);
    return response.data;
  },

  async getUserRoundUps(userId: string, limit = 10) {
    const response = await tapApi.get(`/roundups/${userId}?limit=${limit}`);
    return response.data;
  },

  async verifySignature(data: {
    signatureInput: string;
    signature: string;
    authority: string;
    path: string;
    publicKey?: string;
  }) {
    const response = await tapApi.post('/verify', data);
    return response.data;
  },
};

// DeFi Agent API calls
export const defiAgent = {
  async chat(query: string, userId?: string) {
    const response = await defiApi.post('/chat', { query, userId });
    return response.data;
  },

  async getUserBalance(userId: string) {
    const response = await defiApi.get(`/balance/${userId}`);
    return response.data;
  },

  async manualDeposit(data: {
    userId: string;
    amount: number;
    poolId?: string;
  }) {
    const response = await defiApi.post('/deposit', data);
    return response.data;
  },

  async getPools() {
    const response = await defiApi.get('/pools');
    return response.data;
  },

  async getStatus() {
    const response = await defiApi.get('/status');
    return response.data;
  },
};

// Health checks
export const healthCheck = {
  async tapAgent() {
    const response = await axios.get(`${TAP_AGENT_URL}/health`);
    return response.data;
  },

  async defiAgent() {
    const response = await axios.get(`${DEFI_AGENT_URL}/health`);
    return response.data;
  },
};