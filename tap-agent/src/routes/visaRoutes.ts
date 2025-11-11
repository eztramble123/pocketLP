import { Router, Request, Response } from 'express';
import { VisaKeyRegistry } from '../visa/visaKeyRegistry.js';
import { VisaAuth } from '../visa/visaAuth.js';

export function createVisaRoutes(
  keyRegistry: VisaKeyRegistry,
  visaAuth: VisaAuth
): Router {
  const router = Router();

  /**
   * Register agent with Visa TAP
   * POST /api/visa/register
   */
  router.post('/register', async (req: Request, res: Response) => {
    try {
      // Check if already registered
      const status = await keyRegistry.checkRegistrationStatus();
      
      if (status.registered) {
        return res.json({
          success: true,
          message: 'Already registered with Visa',
          agentId: status.agentId,
          status: status.status
        });
      }

      // Register with Visa
      const registration = await keyRegistry.registerWithVisa();
      
      res.json({
        success: true,
        message: 'Successfully registered with Visa TAP',
        registration
      });
    } catch (error: any) {
      console.error('Visa registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register with Visa',
        details: error.message
      });
    }
  });

  /**
   * Check registration status
   * GET /api/visa/status
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const status = await keyRegistry.checkRegistrationStatus();
      const compliance = status.registered ? 
        await keyRegistry.getComplianceStatus() : null;
      
      res.json({
        registered: status.registered,
        agentId: status.agentId,
        status: status.status,
        compliance: compliance,
        xPayConfigured: visaAuth.isConfigured(),
        maskedApiKey: visaAuth.getMaskedApiKey()
      });
    } catch (error: any) {
      console.error('Status check error:', error);
      res.status(500).json({
        error: 'Failed to check status',
        details: error.message
      });
    }
  });

  /**
   * Verify merchant TAP support
   * POST /api/visa/verify-merchant
   */
  router.post('/verify-merchant', async (req: Request, res: Response) => {
    try {
      const { merchantUrl } = req.body;
      
      if (!merchantUrl) {
        return res.status(400).json({
          error: 'merchantUrl is required'
        });
      }

      const verification = await keyRegistry.verifyMerchantTAPSupport(merchantUrl);
      
      res.json({
        merchantUrl,
        tapSupported: verification.supported,
        merchantId: verification.merchantId,
        supportedTags: verification.supportedTags
      });
    } catch (error: any) {
      console.error('Merchant verification error:', error);
      res.status(500).json({
        error: 'Failed to verify merchant',
        details: error.message
      });
    }
  });

  /**
   * Submit transaction to Visa for compliance
   * POST /api/visa/submit-transaction
   */
  router.post('/submit-transaction', async (req: Request, res: Response) => {
    try {
      const { merchantId, amount, currency = 'USD', signature } = req.body;
      
      if (!merchantId || !amount || !signature) {
        return res.status(400).json({
          error: 'Missing required fields: merchantId, amount, signature'
        });
      }

      const result = await keyRegistry.submitTransactionToVisa({
        merchantId,
        amount,
        currency,
        signature
      });
      
      res.json({
        success: true,
        transactionId: result.transactionId,
        status: result.status,
        timestamp: result.timestamp
      });
    } catch (error: any) {
      console.error('Transaction submission error:', error);
      res.status(500).json({
        error: 'Failed to submit transaction',
        details: error.message
      });
    }
  });

  /**
   * Get compliance report
   * GET /api/visa/compliance
   */
  router.get('/compliance', async (req: Request, res: Response) => {
    try {
      const report = await keyRegistry.getComplianceStatus();
      
      res.json({
        complianceStatus: report.complianceStatus,
        complianceScore: report.complianceScore,
        totalTransactions: report.totalTransactions,
        successRate: report.successRate,
        lastUpdated: report.lastUpdated
      });
    } catch (error: any) {
      console.error('Compliance check error:', error);
      res.status(500).json({
        error: 'Failed to get compliance report',
        details: error.message
      });
    }
  });

  /**
   * Rotate agent keys
   * POST /api/visa/rotate-keys
   */
  router.post('/rotate-keys', async (req: Request, res: Response) => {
    try {
      // This would need proper authorization in production
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Authorization required for key rotation'
        });
      }

      // In production, create new TAP signer with new keys
      // For now, we'll return a placeholder response
      res.json({
        success: false,
        message: 'Key rotation not yet implemented',
        note: 'This endpoint requires manual key generation and secure storage'
      });
    } catch (error: any) {
      console.error('Key rotation error:', error);
      res.status(500).json({
        error: 'Failed to rotate keys',
        details: error.message
      });
    }
  });

  /**
   * Verify X-Pay Token (for testing incoming Visa webhooks)
   * POST /api/visa/verify-xpay
   */
  router.post('/verify-xpay', async (req: Request, res: Response) => {
    try {
      const xPayToken = req.headers['x-pay-token'] as string;
      const resourcePath = req.path;
      const queryParams = req.query as Record<string, any>;
      const requestBody = req.body;

      if (!xPayToken) {
        return res.status(400).json({
          error: 'X-Pay-Token header is required'
        });
      }

      const isValid = visaAuth.verifyXPayToken(
        xPayToken,
        resourcePath,
        queryParams,
        requestBody
      );

      res.json({
        valid: isValid,
        message: isValid ? 'X-Pay Token is valid' : 'X-Pay Token verification failed'
      });
    } catch (error: any) {
      console.error('X-Pay verification error:', error);
      res.status(500).json({
        error: 'Failed to verify X-Pay Token',
        details: error.message
      });
    }
  });

  /**
   * Webhook endpoint for Visa notifications
   * POST /api/visa/webhook
   */
  router.post('/webhook', async (req: Request, res: Response) => {
    try {
      // Verify X-Pay Token for webhook
      const xPayToken = req.headers['x-pay-token'] as string;
      
      if (xPayToken) {
        const isValid = visaAuth.verifyXPayToken(
          xPayToken,
          req.path,
          req.query as Record<string, any>,
          req.body
        );

        if (!isValid) {
          return res.status(401).json({
            error: 'Invalid X-Pay Token'
          });
        }
      }

      // Process webhook notification
      const { eventType, data } = req.body;

      console.log('📨 Visa webhook received:', {
        eventType,
        timestamp: new Date().toISOString()
      });

      switch (eventType) {
        case 'agent.status.changed':
          console.log('Agent status changed:', data);
          break;
        
        case 'compliance.alert':
          console.warn('Compliance alert:', data);
          break;
        
        case 'transaction.verified':
          console.log('Transaction verified by Visa:', data);
          break;
        
        default:
          console.log('Unknown event type:', eventType);
      }

      // Acknowledge webhook
      res.json({
        received: true,
        eventType,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({
        error: 'Failed to process webhook',
        details: error.message
      });
    }
  });

  return router;
}