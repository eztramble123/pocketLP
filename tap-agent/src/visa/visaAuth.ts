import crypto from 'crypto';

interface XPayTokenConfig {
  apiKey: string;
  sharedSecret: string;
}

export class VisaAuth {
  private config: XPayTokenConfig;

  constructor(apiKey?: string, sharedSecret?: string) {
    this.config = {
      apiKey: apiKey || process.env.VISA_API_KEY || '',
      sharedSecret: sharedSecret || process.env.VISA_SHARED_SECRET || ''
    };

    if (!this.config.apiKey || !this.config.sharedSecret) {
      console.warn('⚠️ Visa API credentials not configured. X-Pay Token will not work.');
    }
  }

  /**
   * Generate X-Pay Token for Visa API authentication
   * @param resourcePath - The API endpoint path (e.g., '/tap/v1/agents')
   * @param queryParams - Query parameters as object
   * @param requestBody - Request body as object or string
   * @returns X-Pay Token string
   */
  public generateXPayToken(
    resourcePath: string,
    queryParams: Record<string, any> = {},
    requestBody: any = null
  ): string {
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create query string from params
    const queryString = this.createQueryString(queryParams);
    
    // Create request body string
    const bodyString = requestBody ? 
      (typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody)) : 
      '';

    // Construct the message for HMAC
    // Format: timestamp + resourcePath + queryString + requestBody
    const message = `${timestamp}${resourcePath}${queryString}${bodyString}`;

    // Generate HMAC-SHA256
    const hmac = crypto.createHmac('sha256', this.config.sharedSecret);
    hmac.update(message);
    const hash = hmac.digest('hex');

    // X-Pay Token format: xv2:timestamp:hash
    const xPayToken = `xv2:${timestamp}:${hash}`;
    
    return xPayToken;
  }

  /**
   * Generate headers for Visa API request
   * @param resourcePath - The API endpoint path
   * @param queryParams - Query parameters
   * @param requestBody - Request body
   * @returns Headers object with X-Pay Token
   */
  public getVisaHeaders(
    resourcePath: string,
    queryParams: Record<string, any> = {},
    requestBody: any = null
  ): Record<string, string> {
    const xPayToken = this.generateXPayToken(resourcePath, queryParams, requestBody);
    
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Pay-Token': xPayToken,
      'X-Client-Id': this.config.apiKey,
      'X-Correlation-Id': this.generateCorrelationId()
    };
  }

  /**
   * Verify X-Pay Token (for incoming requests from Visa)
   * @param token - The X-Pay Token to verify
   * @param resourcePath - The API endpoint path
   * @param queryParams - Query parameters
   * @param requestBody - Request body
   * @returns Boolean indicating if token is valid
   */
  public verifyXPayToken(
    token: string,
    resourcePath: string,
    queryParams: Record<string, any> = {},
    requestBody: any = null
  ): boolean {
    try {
      // Parse the token
      const parts = token.split(':');
      if (parts.length !== 3 || parts[0] !== 'xv2') {
        return false;
      }

      const [, timestamp, receivedHash] = parts;
      
      // Check timestamp is within acceptable window (5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenTime = parseInt(timestamp);
      if (Math.abs(currentTime - tokenTime) > 300) {
        console.warn('X-Pay Token expired or timestamp invalid');
        return false;
      }

      // Recreate the message
      const queryString = this.createQueryString(queryParams);
      const bodyString = requestBody ? 
        (typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody)) : 
        '';
      const message = `${timestamp}${resourcePath}${queryString}${bodyString}`;

      // Generate expected hash
      const hmac = crypto.createHmac('sha256', this.config.sharedSecret);
      hmac.update(message);
      const expectedHash = hmac.digest('hex');

      // Compare hashes
      return crypto.timingSafeEqual(
        Buffer.from(receivedHash),
        Buffer.from(expectedHash)
      );
    } catch (error) {
      console.error('Error verifying X-Pay Token:', error);
      return false;
    }
  }

  /**
   * Create query string from parameters object
   * @param params - Query parameters object
   * @returns Formatted query string
   */
  private createQueryString(params: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return '';
    }

    // Sort parameters alphabetically by key
    const sortedKeys = Object.keys(params).sort();
    
    // Build query string
    const queryPairs = sortedKeys
      .filter(key => params[key] !== undefined && params[key] !== null)
      .map(key => `${key}=${encodeURIComponent(params[key])}`);
    
    return queryPairs.length > 0 ? `?${queryPairs.join('&')}` : '';
  }

  /**
   * Generate a unique correlation ID for request tracking
   * @returns Correlation ID string
   */
  private generateCorrelationId(): string {
    return `tap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if Visa credentials are configured
   * @returns Boolean indicating if credentials are set
   */
  public isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.sharedSecret);
  }

  /**
   * Get the configured API key (for logging, not for exposure)
   * @returns Masked API key
   */
  public getMaskedApiKey(): string {
    if (!this.config.apiKey) return 'NOT_CONFIGURED';
    return `${this.config.apiKey.substring(0, 8)}...${this.config.apiKey.slice(-4)}`;
  }
}