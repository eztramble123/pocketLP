import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { VisaAuth } from './visaAuth.js';

interface VisaClientConfig {
  baseURL?: string;
  apiKey?: string;
  sharedSecret?: string;
  timeout?: number;
  sandbox?: boolean;
}

interface AgentRegistration {
  agentId: string;
  agentName: string;
  publicKey: string;
  keyId: string;
  capabilities: string[];
  status: 'active' | 'pending' | 'suspended';
}

interface MerchantVerification {
  merchantId: string;
  merchantName: string;
  tapEnabled: boolean;
  supportedTags: string[];
}

export class VisaClient {
  private client: AxiosInstance;
  private auth: VisaAuth;
  private baseURL: string;

  constructor(config: VisaClientConfig = {}) {
    this.baseURL = config.baseURL || 
      (config.sandbox !== false ? 
        'https://sandbox.api.visa.com' : 
        'https://api.visa.com');

    this.auth = new VisaAuth(config.apiKey, config.sharedSecret);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to add X-Pay Token
    this.client.interceptors.request.use(
      (config) => this.addXPayToken(config),
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  /**
   * Register agent with Visa TAP
   * @param agentData - Agent registration data
   * @returns Registration response
   */
  public async registerAgent(agentData: Partial<AgentRegistration>): Promise<AgentRegistration> {
    const response = await this.client.post('/tap/v1/agents/register', {
      agentId: agentData.agentId,
      agentName: agentData.agentName,
      publicKey: agentData.publicKey,
      keyId: agentData.keyId,
      capabilities: agentData.capabilities || ['browsing', 'payment'],
      timestamp: new Date().toISOString()
    });

    return response.data;
  }

  /**
   * Update agent public key with Visa
   * @param keyId - Key identifier
   * @param publicKey - New public key in JWK format
   * @returns Update response
   */
  public async updateAgentKey(keyId: string, publicKey: any): Promise<any> {
    const response = await this.client.put(`/tap/v1/agents/keys/${keyId}`, {
      publicKey,
      algorithm: 'Ed25519',
      use: 'sig',
      timestamp: new Date().toISOString()
    });

    return response.data;
  }

  /**
   * Verify merchant TAP support
   * @param merchantUrl - Merchant domain/URL
   * @returns Merchant verification data
   */
  public async verifyMerchant(merchantUrl: string): Promise<MerchantVerification> {
    const response = await this.client.get('/tap/v1/merchants/verify', {
      params: { url: merchantUrl }
    });

    return response.data;
  }

  /**
   * Get agent status from Visa
   * @param agentId - Agent identifier
   * @returns Agent status data
   */
  public async getAgentStatus(agentId: string): Promise<AgentRegistration> {
    const response = await this.client.get(`/tap/v1/agents/${agentId}`);
    return response.data;
  }

  /**
   * Submit transaction for TAP compliance
   * @param transactionData - Transaction details
   * @returns Compliance response
   */
  public async submitTransaction(transactionData: {
    agentId: string;
    merchantId: string;
    amount: number;
    currency: string;
    signature: string;
    timestamp: string;
  }): Promise<any> {
    const response = await this.client.post('/tap/v1/transactions', transactionData);
    return response.data;
  }

  /**
   * Get public keys from Visa Key Store
   * @param keyId - Optional specific key ID
   * @returns Public keys in JWK format
   */
  public async getPublicKeys(keyId?: string): Promise<any> {
    const path = keyId ? 
      `/tap/v1/keys/${keyId}` : 
      '/tap/v1/keys';
    
    const response = await this.client.get(path);
    return response.data;
  }

  /**
   * Validate TAP signature with Visa
   * @param signatureData - Signature to validate
   * @returns Validation result
   */
  public async validateSignature(signatureData: {
    signature: string;
    signatureInput: string;
    requestData: {
      authority: string;
      path: string;
      method: string;
    };
  }): Promise<{ valid: boolean; details?: any }> {
    const response = await this.client.post('/tap/v1/signatures/validate', signatureData);
    return response.data;
  }

  /**
   * Get TAP compliance report
   * @param agentId - Agent identifier
   * @param startDate - Start date for report
   * @param endDate - End date for report
   * @returns Compliance report data
   */
  public async getComplianceReport(
    agentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const params: any = { agentId };
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();

    const response = await this.client.get('/tap/v1/compliance/report', { params });
    return response.data;
  }

  /**
   * Add X-Pay Token to request
   * @param config - Axios request config
   * @returns Modified config with X-Pay Token
   */
  private addXPayToken(config: AxiosRequestConfig): AxiosRequestConfig {
    if (!this.auth.isConfigured()) {
      console.warn('Visa credentials not configured, skipping X-Pay Token');
      return config;
    }

    // Extract resource path (remove base URL)
    const resourcePath = config.url?.startsWith('http') ? 
      new URL(config.url).pathname : 
      config.url || '';

    // Get query parameters
    const queryParams = config.params || {};

    // Get request body
    const requestBody = config.data;

    // Generate Visa headers with X-Pay Token
    const visaHeaders = this.auth.getVisaHeaders(resourcePath, queryParams, requestBody);

    // Merge headers
    config.headers = {
      ...config.headers,
      ...visaHeaders
    };

    return config;
  }

  /**
   * Handle API errors
   * @param error - Axios error
   * @returns Rejected promise with formatted error
   */
  private async handleError(error: any): Promise<any> {
    if (error.response) {
      // Visa API returned an error
      const visaError = {
        status: error.response.status,
        message: error.response.data?.message || 'Visa API error',
        errorCode: error.response.data?.errorCode,
        correlationId: error.response.headers['x-correlation-id'],
        details: error.response.data
      };

      console.error('Visa API Error:', visaError);
      return Promise.reject(visaError);
    } else if (error.request) {
      // Request was made but no response
      console.error('No response from Visa API:', error.request);
      return Promise.reject({
        message: 'No response from Visa API',
        details: error.message
      });
    } else {
      // Error in request setup
      console.error('Request setup error:', error.message);
      return Promise.reject({
        message: 'Request configuration error',
        details: error.message
      });
    }
  }

  /**
   * Health check for Visa API
   * @returns Health status
   */
  public async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.client.get('/tap/v1/health');
      return response.data;
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get Visa TAP configuration
   * @returns TAP configuration data
   */
  public async getTAPConfiguration(): Promise<any> {
    const response = await this.client.get('/tap/v1/configuration');
    return response.data;
  }
}