import { Router, Request, Response } from 'express';
import { VisaKeyRegistry } from '../visa/visaKeyRegistry.js';

export function createWellKnownRoutes(keyRegistry: VisaKeyRegistry): Router {
  const router = Router();

  /**
   * JWKS Discovery Endpoint
   * Allows merchants and Visa to discover our public keys
   * https://YOUR_DOMAIN/.well-known/jwks
   */
  router.get('/.well-known/jwks', async (req: Request, res: Response) => {
    try {
      const jwks = keyRegistry.getJWKS();
      
      // Add cache headers for performance
      res.set({
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Type': 'application/json'
      });

      res.json(jwks);
    } catch (error) {
      console.error('Error serving JWKS:', error);
      res.status(500).json({
        error: 'Failed to retrieve public keys'
      });
    }
  });

  /**
   * Agent Metadata Endpoint
   * Provides information about our TAP agent
   */
  router.get('/.well-known/tap-agent', async (req: Request, res: Response) => {
    try {
      const metadata = {
        name: 'PocketLP Round-up Agent',
        version: '1.0.0',
        capabilities: [
          'agent-browser-auth',
          'agent-payer-auth',
          'round-up-savings',
          'defi-investment'
        ],
        supportedTags: [
          'agent-browser-auth',
          'agent-payer-auth'
        ],
        keyDiscoveryUrl: `${req.protocol}://${req.get('host')}/.well-known/jwks`,
        contactEmail: process.env.AGENT_CONTACT_EMAIL || 'support@pocketlp.com',
        complianceStatus: 'active',
        documentation: 'https://docs.pocketlp.com/tap'
      };

      res.set({
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Content-Type': 'application/json'
      });

      res.json(metadata);
    } catch (error) {
      console.error('Error serving agent metadata:', error);
      res.status(500).json({
        error: 'Failed to retrieve agent metadata'
      });
    }
  });

  /**
   * OpenAPI/Swagger specification
   * Documents our TAP implementation
   */
  router.get('/.well-known/tap-openapi', async (req: Request, res: Response) => {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'PocketLP TAP Agent API',
        version: '1.0.0',
        description: 'Trusted Agent Protocol implementation for round-up savings'
      },
      servers: [
        {
          url: `${req.protocol}://${req.get('host')}`,
          description: 'Current server'
        }
      ],
      paths: {
        '/.well-known/jwks': {
          get: {
            summary: 'Get public keys in JWK format',
            responses: {
              '200': {
                description: 'JWKS containing public keys',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        keys: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              kty: { type: 'string' },
                              kid: { type: 'string' },
                              use: { type: 'string' },
                              alg: { type: 'string' },
                              crv: { type: 'string' },
                              x: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/api/tap/sign': {
          post: {
            summary: 'Generate TAP signature',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      authority: { type: 'string' },
                      path: { type: 'string' },
                      tag: { 
                        type: 'string',
                        enum: ['agent-browser-auth', 'agent-payer-auth']
                      }
                    },
                    required: ['authority', 'path', 'tag']
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'TAP signature generated',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        signature: { type: 'object' },
                        keyId: { type: 'string' },
                        nonce: { type: 'string' },
                        publicKey: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    res.set({
      'Cache-Control': 'public, max-age=86400',
      'Content-Type': 'application/json'
    });

    res.json(spec);
  });

  /**
   * Health check endpoint for monitoring
   */
  router.get('/.well-known/health', async (req: Request, res: Response) => {
    try {
      // Check Visa registration status
      const registrationStatus = await keyRegistry.checkRegistrationStatus();
      
      res.json({
        status: 'healthy',
        service: 'tap-agent',
        timestamp: new Date().toISOString(),
        visa: {
          registered: registrationStatus.registered,
          agentId: registrationStatus.agentId,
          status: registrationStatus.status
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        service: 'tap-agent',
        timestamp: new Date().toISOString(),
        error: 'Failed to check Visa registration'
      });
    }
  });

  return router;
}