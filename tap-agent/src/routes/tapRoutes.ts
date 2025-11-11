import { Router, Request, Response } from 'express';
import { TAPSigner } from '../crypto/tapSigner.js';
import { RoundUpEngine } from '../services/roundupEngine.js';
import { RedisClient } from '../services/redis.js';
import crypto from 'crypto';

interface PurchaseRequest {
  userId: string;
  amount: number;
  merchantUrl: string;
  merchantPath?: string;
}

interface SignRequest {
  authority: string;
  path: string;
  tag: 'agent-browser-auth' | 'agent-payer-auth';
}

export function createTAPRoutes(
  tapSigner: TAPSigner,
  roundupEngine: RoundUpEngine,
  redis: RedisClient
): Router {
  const router = Router();

  // Generate TAP signature for merchant requests
  router.post('/sign', async (req: Request<{}, {}, SignRequest>, res: Response) => {
    try {
      const { authority, path, tag } = req.body;

      if (!authority || !path || !tag) {
        return res.status(400).json({
          error: 'Missing required fields: authority, path, tag'
        });
      }

      // Generate nonce
      const nonce = crypto.randomBytes(64).toString('base64');

      const signature = tapSigner.signTAPRequest({
        authority,
        path,
        method: 'GET',
        keyId: tapSigner.getKeyId(),
        nonce,
        tag
      });

      res.json({
        signature,
        keyId: tapSigner.getKeyId(),
        nonce,
        publicKey: tapSigner.getPublicKey()
      });
    } catch (error) {
      console.error('Error signing TAP request:', error);
      res.status(500).json({ error: 'Failed to sign request' });
    }
  });

  // Process purchase and calculate round-up
  router.post('/purchase', async (req: Request<{}, {}, PurchaseRequest>, res: Response) => {
    try {
      const { userId, amount, merchantUrl, merchantPath = '/checkout' } = req.body;

      if (!userId || !amount || !merchantUrl) {
        return res.status(400).json({
          error: 'Missing required fields: userId, amount, merchantUrl'
        });
      }

      // Generate transaction ID
      const transactionId = crypto.randomUUID();

      // Generate TAP signature for this purchase
      const nonce = crypto.randomBytes(64).toString('base64');
      const authority = new URL(merchantUrl).hostname;

      const signature = tapSigner.signTAPRequest({
        authority,
        path: merchantPath,
        method: 'POST',
        keyId: tapSigner.getKeyId(),
        nonce,
        tag: 'agent-payer-auth'
      });

      // Process round-up
      const roundUpData = await roundupEngine.processRoundUp(
        userId,
        transactionId,
        amount
      );

      res.json({
        transactionId,
        originalAmount: amount,
        roundUpAmount: roundUpData.roundUpAmount,
        accumulatedTotal: roundUpData.accumulatedTotal,
        signature,
        thresholdReached: roundUpData.accumulatedTotal >= 10
      });
    } catch (error) {
      console.error('Error processing purchase:', error);
      res.status(500).json({ error: 'Failed to process purchase' });
    }
  });

  // Verify TAP signature (for merchants)
  router.post('/verify', async (req: Request, res: Response) => {
    try {
      const {
        signatureInput,
        signature,
        authority,
        path,
        publicKey
      } = req.body;

      if (!signatureInput || !signature || !authority || !path) {
        return res.status(400).json({
          error: 'Missing required verification fields'
        });
      }

      // Parse signature input to extract parameters
      const params = parseSignatureInput(signatureInput);
      
      // Recreate signature base
      const signatureBase = createSignatureBase(authority, path, params);
      
      // Verify signature
      let pubKeyBytes: Uint8Array;
      if (publicKey) {
        pubKeyBytes = Buffer.from(publicKey, 'base64');
      } else {
        // Use our own public key for testing
        pubKeyBytes = Buffer.from(tapSigner.getPublicKey(), 'base64');
      }

      const isValid = tapSigner.verifySignature(
        signatureBase,
        signature.replace(/^sig2=:/, '').replace(/:$/, ''),
        pubKeyBytes
      );

      res.json({
        valid: isValid,
        keyId: params.keyid,
        timestamp: params.created,
        expires: params.expires
      });
    } catch (error) {
      console.error('Error verifying signature:', error);
      res.status(500).json({ error: 'Failed to verify signature' });
    }
  });

  // Get user's round-up history
  router.get('/roundups/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const roundUps = await roundupEngine.getUserRoundUps(userId, limit);
      const totalAccumulated = await redis.get(`roundup:total:${userId}`);

      res.json({
        roundUps,
        totalAccumulated: parseFloat(totalAccumulated || '0'),
        count: roundUps.length
      });
    } catch (error) {
      console.error('Error fetching round-ups:', error);
      res.status(500).json({ error: 'Failed to fetch round-ups' });
    }
  });

  return router;
}

// Helper functions
function parseSignatureInput(signatureInput: string): any {
  const params: any = {};
  
  const matches = signatureInput.match(/(\w+)=([^;]+)/g);
  if (matches) {
    matches.forEach(match => {
      const [key, value] = match.split('=');
      params[key] = value.replace(/"/g, '');
    });
  }
  
  return params;
}

function createSignatureBase(authority: string, path: string, params: any): string {
  return `"@authority": ${authority}\n` +
         `"@path": ${path}\n` +
         `"@signature-params": sig2=("@authority" "@path");` +
         `created=${params.created};` +
         `keyid="${params.keyid}";` +
         `expires=${params.expires};` +
         `nonce="${params.nonce}";` +
         `tag="${params.tag}"`;
}