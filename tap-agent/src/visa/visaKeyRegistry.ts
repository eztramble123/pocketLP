import * as bs58 from 'bs58';
import { TAPSigner } from '../crypto/tapSigner.js';
import { VisaClient } from './visaClient.js';

interface JWK {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  x?: string; // For Ed25519
  n?: string; // For RSA
  e?: string; // For RSA
  crv?: string; // Curve for EC keys
}

interface JWKS {
  keys: JWK[];
}

export class VisaKeyRegistry {
  private visaClient: VisaClient;
  private tapSigner: TAPSigner;
  private registeredKeys: Map<string, JWK> = new Map();

  constructor(tapSigner: TAPSigner, visaClient: VisaClient) {
    this.tapSigner = tapSigner;
    this.visaClient = visaClient;
  }

  /**
   * Register our TAP public key with Visa
   * @returns Registration result
   */
  public async registerWithVisa(): Promise<any> {
    try {
      const publicKey = this.tapSigner.getPublicKey();
      const keyId = this.tapSigner.getKeyId();
      
      // Convert Ed25519 public key to JWK format
      const jwk = this.ed25519ToJWK(publicKey, keyId);
      
      // Register with Visa
      const registration = await this.visaClient.registerAgent({
        agentId: `pocketlp_${keyId.substring(0, 8)}`,
        agentName: 'PocketLP Round-up Agent',
        publicKey: JSON.stringify(jwk),
        keyId: keyId,
        capabilities: ['browsing', 'payment', 'round-up']
      });

      // Store registered key
      this.registeredKeys.set(keyId, jwk);
      
      console.log('✅ Successfully registered with Visa TAP:', {
        agentId: registration.agentId,
        status: registration.status
      });

      return registration;
    } catch (error) {
      console.error('Failed to register with Visa:', error);
      throw error;
    }
  }

  /**
   * Convert Ed25519 public key to JWK format
   * @param publicKeyBase58 - Base58 encoded public key
   * @param keyId - Key identifier
   * @returns JWK object
   */
  private ed25519ToJWK(publicKeyBase58: string, keyId: string): JWK {
    // Decode from base58
    const publicKeyBytes = bs58.decode(publicKeyBase58);
    
    // Convert to base64url for JWK
    const x = this.base64urlEncode(publicKeyBytes);
    
    return {
      kty: 'OKP', // Octet Key Pair for Ed25519
      kid: keyId,
      use: 'sig',
      alg: 'EdDSA',
      crv: 'Ed25519',
      x: x
    };
  }

  /**
   * Get JWKS for public key discovery
   * @returns JWKS object with all registered keys
   */
  public getJWKS(): JWKS {
    const publicKey = this.tapSigner.getPublicKey();
    const keyId = this.tapSigner.getKeyId();
    
    // Always include current key
    const currentJWK = this.ed25519ToJWK(publicKey, keyId);
    this.registeredKeys.set(keyId, currentJWK);
    
    return {
      keys: Array.from(this.registeredKeys.values())
    };
  }

  /**
   * Rotate key with Visa
   * @param newSigner - New TAP signer instance
   * @returns Update result
   */
  public async rotateKey(newSigner: TAPSigner): Promise<any> {
    const newPublicKey = newSigner.getPublicKey();
    const newKeyId = newSigner.getKeyId();
    
    // Create new JWK
    const newJWK = this.ed25519ToJWK(newPublicKey, newKeyId);
    
    // Update with Visa
    const result = await this.visaClient.updateAgentKey(newKeyId, newJWK);
    
    // Update local registry
    this.registeredKeys.set(newKeyId, newJWK);
    
    // Keep old key for grace period (for signature verification)
    // In production, implement proper key rotation with expiry
    
    console.log('🔄 Key rotated successfully:', {
      oldKeyId: this.tapSigner.getKeyId().substring(0, 8) + '...',
      newKeyId: newKeyId.substring(0, 8) + '...'
    });

    // Update signer
    this.tapSigner = newSigner;
    
    return result;
  }

  /**
   * Verify if a merchant supports TAP
   * @param merchantUrl - Merchant URL/domain
   * @returns Verification result
   */
  public async verifyMerchantTAPSupport(merchantUrl: string): Promise<{
    supported: boolean;
    merchantId?: string;
    supportedTags?: string[];
  }> {
    try {
      const verification = await this.visaClient.verifyMerchant(merchantUrl);
      
      return {
        supported: verification.tapEnabled,
        merchantId: verification.merchantId,
        supportedTags: verification.supportedTags
      };
    } catch (error) {
      console.error(`Failed to verify merchant ${merchantUrl}:`, error);
      return { supported: false };
    }
  }

  /**
   * Get Visa's public keys for verification
   * @param keyId - Optional specific key ID
   * @returns Public keys from Visa
   */
  public async getVisaPublicKeys(keyId?: string): Promise<JWKS> {
    try {
      const keys = await this.visaClient.getPublicKeys(keyId);
      return keys;
    } catch (error) {
      console.error('Failed to get Visa public keys:', error);
      throw error;
    }
  }

  /**
   * Submit transaction to Visa for compliance
   * @param transaction - Transaction data
   * @returns Submission result
   */
  public async submitTransactionToVisa(transaction: {
    merchantId: string;
    amount: number;
    currency: string;
    signature: string;
  }): Promise<any> {
    try {
      const keyId = this.tapSigner.getKeyId();
      
      const result = await this.visaClient.submitTransaction({
        agentId: `pocketlp_${keyId.substring(0, 8)}`,
        merchantId: transaction.merchantId,
        amount: transaction.amount,
        currency: transaction.currency,
        signature: transaction.signature,
        timestamp: new Date().toISOString()
      });

      console.log('📤 Transaction submitted to Visa:', {
        transactionId: result.transactionId,
        status: result.status
      });

      return result;
    } catch (error) {
      console.error('Failed to submit transaction to Visa:', error);
      throw error;
    }
  }

  /**
   * Get agent compliance status from Visa
   * @returns Compliance report
   */
  public async getComplianceStatus(): Promise<any> {
    try {
      const keyId = this.tapSigner.getKeyId();
      const agentId = `pocketlp_${keyId.substring(0, 8)}`;
      
      const report = await this.visaClient.getComplianceReport(agentId);
      
      console.log('📊 Compliance Status:', {
        agentId,
        status: report.complianceStatus,
        score: report.complianceScore
      });

      return report;
    } catch (error) {
      console.error('Failed to get compliance status:', error);
      throw error;
    }
  }

  /**
   * Base64url encode bytes
   * @param bytes - Byte array
   * @returns Base64url encoded string
   */
  private base64urlEncode(bytes: Uint8Array): string {
    const base64 = Buffer.from(bytes).toString('base64');
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Check if we're registered with Visa
   * @returns Registration status
   */
  public async checkRegistrationStatus(): Promise<{
    registered: boolean;
    agentId?: string;
    status?: string;
  }> {
    try {
      const keyId = this.tapSigner.getKeyId();
      const agentId = `pocketlp_${keyId.substring(0, 8)}`;
      
      const status = await this.visaClient.getAgentStatus(agentId);
      
      return {
        registered: true,
        agentId: status.agentId,
        status: status.status
      };
    } catch (error: any) {
      if (error.status === 404) {
        return { registered: false };
      }
      throw error;
    }
  }
}