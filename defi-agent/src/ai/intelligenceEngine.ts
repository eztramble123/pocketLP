import { OpenAI } from 'openai';

interface UserProfile {
  userId: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  spendingPatterns: SpendingPattern[];
  investmentHistory: InvestmentHistory[];
  preferences: UserPreferences;
}

interface SpendingPattern {
  category: string;
  averageAmount: number;
  frequency: string;
  roundUpFrequency: number;
}

interface InvestmentHistory {
  poolId: string;
  amount: number;
  entryDate: Date;
  exitDate?: Date;
  performance: number;
}

interface UserPreferences {
  maxGasSpend: number;
  minYieldThreshold: number;
  preferredPoolTypes: string[];
  notificationSettings: {
    yieldAlerts: boolean;
    riskWarnings: boolean;
    marketUpdates: boolean;
  };
}

interface MarketData {
  pools: PoolAnalytics[];
  sentiment: MarketSentiment;
  volatility: VolatilityData;
}

interface PoolAnalytics {
  poolId: string;
  currentApy: number;
  predictedApy: number;
  riskScore: number;
  liquidityTrend: 'increasing' | 'decreasing' | 'stable';
  userScore: number;
}

interface MarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  factors: string[];
}

interface VolatilityData {
  current: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  prediction24h: number;
}

export class IntelligenceEngine {
  private openai: OpenAI;
  private userProfiles: Map<string, UserProfile> = new Map();
  private marketData: MarketData | null = null;

  constructor(openaiKey: string) {
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  // Advanced yield prediction using ML
  async predictYieldOpportunities(userId: string): Promise<PoolAnalytics[]> {
    const userProfile = await this.getUserProfile(userId);
    const marketData = await this.getMarketData();
    
    // Use AI to analyze pool performance and predict yields
    const prompt = `
    Given the following data:
    - User risk tolerance: ${userProfile.riskTolerance}
    - Market sentiment: ${marketData.sentiment.overall}
    - Available pools: ${JSON.stringify(marketData.pools)}
    
    Predict the best yield opportunities for the next 7 days.
    Consider:
    1. Historical performance
    2. Liquidity trends
    3. Risk scores
    4. User preferences
    
    Return predictions in JSON format with confidence scores.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    try {
      const predictions = JSON.parse(response.choices[0]?.message?.content || '[]');
      return this.processYieldPredictions(predictions, userProfile);
    } catch (error) {
      console.error('Error parsing AI predictions:', error);
      return this.getFallbackPredictions();
    }
  }

  // Risk assessment algorithm
  async assessRisk(userId: string, poolId: string, amount: number): Promise<{
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    warnings: string[];
    recommendations: string[];
  }> {
    const userProfile = await this.getUserProfile(userId);
    const poolData = await this.getPoolData(poolId);
    
    // Calculate multiple risk factors
    const liquidityRisk = this.calculateLiquidityRisk(poolData);
    const concentrationRisk = this.calculateConcentrationRisk(userId, amount);
    const volatilityRisk = this.calculateVolatilityRisk(poolData);
    const userExperienceRisk = this.calculateUserExperienceRisk(userProfile);
    
    const totalRiskScore = (
      liquidityRisk * 0.3 +
      concentrationRisk * 0.25 +
      volatilityRisk * 0.25 +
      userExperienceRisk * 0.2
    );

    const riskLevel = totalRiskScore < 0.3 ? 'low' : 
                     totalRiskScore < 0.7 ? 'medium' : 'high';

    const warnings = this.generateRiskWarnings(totalRiskScore, {
      liquidityRisk,
      concentrationRisk, 
      volatilityRisk
    });

    const recommendations = await this.generateAIRecommendations(
      userProfile, 
      poolData, 
      totalRiskScore
    );

    return {
      riskScore: totalRiskScore,
      riskLevel,
      warnings,
      recommendations
    };
  }

  // Learning from user behavior
  async learnFromUserBehavior(userId: string, action: {
    type: 'deposit' | 'withdraw' | 'pool_switch';
    poolId: string;
    amount: number;
    outcome: 'positive' | 'negative' | 'neutral';
    timestamp: Date;
  }): Promise<void> {
    const userProfile = await this.getUserProfile(userId);
    
    // Update spending patterns
    if (action.type === 'deposit') {
      this.updateSpendingPatterns(userProfile, action);
    }

    // Adjust risk tolerance based on behavior
    this.adjustRiskTolerance(userProfile, action);

    // Update investment history
    userProfile.investmentHistory.push({
      poolId: action.poolId,
      amount: action.amount,
      entryDate: action.timestamp,
      performance: 0 // Will be updated later
    });

    // Store updated profile
    this.userProfiles.set(userId, userProfile);
  }

  // Market sentiment analysis
  async analyzeMarketSentiment(): Promise<MarketSentiment> {
    const prompt = `
    Analyze current DeFi market sentiment based on:
    - Recent Solana ecosystem developments
    - Jupiter DEX trading volumes
    - Overall crypto market conditions
    - Liquidity provider trends
    
    Provide sentiment analysis with confidence score and key factors.
    Return in JSON format: { "overall": "bullish|bearish|neutral", "confidence": 0-1, "factors": ["factor1", "factor2"] }
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    try {
      const sentiment = JSON.parse(response.choices[0]?.message?.content || '{}');
      return sentiment;
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        overall: 'neutral',
        confidence: 0.5,
        factors: ['Unable to analyze market conditions']
      };
    }
  }

  // Personalized investment strategies
  async generateInvestmentStrategy(userId: string): Promise<{
    strategy: string;
    allocation: { [poolType: string]: number };
    reasoning: string[];
    timeline: string;
  }> {
    const userProfile = await this.getUserProfile(userId);
    const marketData = await this.getMarketData();
    
    const prompt = `
    Create a personalized investment strategy for a user with:
    - Risk tolerance: ${userProfile.riskTolerance}
    - Average monthly round-ups: $${this.calculateMonthlyRoundUps(userProfile)}
    - Investment history: ${userProfile.investmentHistory.length} positions
    - Current market: ${marketData.sentiment.overall}
    
    Provide:
    1. Overall strategy description
    2. Pool allocation percentages
    3. Reasoning for recommendations  
    4. Timeline for strategy
    
    Return in JSON format.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    try {
      const strategy = JSON.parse(response.choices[0]?.message?.content || '{}');
      return strategy;
    } catch (error) {
      console.error('Error generating strategy:', error);
      return this.getDefaultStrategy(userProfile.riskTolerance);
    }
  }

  // Enhanced chat intelligence with context
  async processChat(userId: string, message: string, conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>): Promise<{
    response: string;
    actions?: Array<{
      type: string;
      data: any;
    }>;
    confidence: number;
  }> {
    const userProfile = await this.getUserProfile(userId);
    const marketData = await this.getMarketData();
    
    // Build context-aware prompt
    const systemPrompt = `
    You are an intelligent DeFi assistant for PocketLP. You help users optimize their round-up investments.
    
    User Context:
    - Risk tolerance: ${userProfile.riskTolerance}
    - Total invested: $${this.calculateTotalInvested(userProfile)}
    - Current market sentiment: ${marketData.sentiment.overall}
    
    Your capabilities:
    - Yield analysis and recommendations
    - Risk assessment and warnings
    - Investment strategy advice
    - Market insights and trends
    - Portfolio optimization
    
    Be helpful, accurate, and personalized. If you recommend actions, include them in the response.
    `;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ];

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = response.choices[0]?.message?.content || '';
    
    // Extract potential actions from response
    const actions = this.extractActionsFromResponse(responseText);
    
    return {
      response: responseText,
      actions,
      confidence: 0.8 // Could be calculated based on response quality
    };
  }

  // Fraud detection
  async detectFraud(userId: string, transaction: {
    amount: number;
    merchantUrl: string;
    timestamp: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{
    isFraudulent: boolean;
    riskScore: number;
    reasons: string[];
  }> {
    const userProfile = await this.getUserProfile(userId);
    
    const checks = [
      this.checkAmountAnomaly(userProfile, transaction.amount),
      this.checkMerchantPattern(userProfile, transaction.merchantUrl),
      this.checkTimingPattern(userProfile, transaction.timestamp),
      this.checkVelocityPattern(userId, transaction.timestamp)
    ];

    const riskScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
    const reasons = checks.filter(check => check.flagged).map(check => check.reason);

    return {
      isFraudulent: riskScore > 0.7,
      riskScore,
      reasons
    };
  }

  // Private helper methods
  private async getUserProfile(userId: string): Promise<UserProfile> {
    if (!this.userProfiles.has(userId)) {
      // Create default profile
      const defaultProfile: UserProfile = {
        userId,
        riskTolerance: 'moderate',
        spendingPatterns: [],
        investmentHistory: [],
        preferences: {
          maxGasSpend: 0.005, // 0.005 SOL
          minYieldThreshold: 5.0, // 5% APY
          preferredPoolTypes: ['stable', 'low-risk'],
          notificationSettings: {
            yieldAlerts: true,
            riskWarnings: true,
            marketUpdates: false
          }
        }
      };
      this.userProfiles.set(userId, defaultProfile);
    }
    
    return this.userProfiles.get(userId)!;
  }

  private async getMarketData(): Promise<MarketData> {
    if (!this.marketData) {
      // Simulate market data - in production, fetch from real sources
      this.marketData = {
        pools: [
          {
            poolId: 'jupiter_usdc_sol_001',
            currentApy: 8.5,
            predictedApy: 9.2,
            riskScore: 0.3,
            liquidityTrend: 'stable',
            userScore: 0.8
          }
        ],
        sentiment: await this.analyzeMarketSentiment(),
        volatility: {
          current: 0.15,
          trend: 'stable',
          prediction24h: 0.14
        }
      };
    }
    
    return this.marketData;
  }

  private processYieldPredictions(predictions: any[], userProfile: UserProfile): PoolAnalytics[] {
    // Process AI predictions and apply user preferences
    return predictions.map(pred => ({
      ...pred,
      userScore: this.calculateUserScore(pred, userProfile)
    }));
  }

  private calculateUserScore(pool: any, userProfile: UserProfile): number {
    // Calculate how well this pool fits the user's profile
    let score = 0.5; // Base score

    // Risk alignment
    if (userProfile.riskTolerance === 'conservative' && pool.riskScore < 0.3) {
      score += 0.3;
    } else if (userProfile.riskTolerance === 'aggressive' && pool.riskScore > 0.6) {
      score += 0.3;
    }

    // Yield threshold
    if (pool.currentApy >= userProfile.preferences.minYieldThreshold) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  private getFallbackPredictions(): PoolAnalytics[] {
    return [
      {
        poolId: 'jupiter_usdc_sol_001',
        currentApy: 8.5,
        predictedApy: 8.5,
        riskScore: 0.3,
        liquidityTrend: 'stable',
        userScore: 0.8
      }
    ];
  }

  private calculateLiquidityRisk(poolData: any): number {
    // Calculate risk based on pool liquidity
    return 0.2; // Placeholder
  }

  private calculateConcentrationRisk(userId: string, amount: number): number {
    // Calculate risk based on portfolio concentration
    return 0.1; // Placeholder
  }

  private calculateVolatilityRisk(poolData: any): number {
    // Calculate risk based on price volatility
    return 0.3; // Placeholder
  }

  private calculateUserExperienceRisk(userProfile: UserProfile): number {
    // Calculate risk based on user experience level
    return userProfile.investmentHistory.length < 5 ? 0.4 : 0.1;
  }

  private generateRiskWarnings(riskScore: number, risks: any): string[] {
    const warnings: string[] = [];
    
    if (risks.liquidityRisk > 0.5) {
      warnings.push('Low liquidity pool - may be difficult to exit position');
    }
    
    if (risks.concentrationRisk > 0.6) {
      warnings.push('High portfolio concentration - consider diversification');
    }
    
    if (risks.volatilityRisk > 0.7) {
      warnings.push('High volatility detected - expect significant price swings');
    }
    
    return warnings;
  }

  private async generateAIRecommendations(
    userProfile: UserProfile, 
    poolData: any, 
    riskScore: number
  ): Promise<string[]> {
    // Use AI to generate personalized recommendations
    const recommendations: string[] = [];
    
    if (riskScore > 0.7 && userProfile.riskTolerance === 'conservative') {
      recommendations.push('Consider a more conservative pool given your risk tolerance');
    }
    
    if (userProfile.investmentHistory.length < 3) {
      recommendations.push('Start with smaller amounts while learning DeFi basics');
    }
    
    return recommendations;
  }

  private updateSpendingPatterns(userProfile: UserProfile, action: any): void {
    // Update user spending patterns based on new transaction
    // This would analyze the merchant, amount, and timing
  }

  private adjustRiskTolerance(userProfile: UserProfile, action: any): void {
    // Adjust user risk tolerance based on their actions
    // If they consistently choose high-risk pools, increase tolerance
  }

  private calculateMonthlyRoundUps(userProfile: UserProfile): number {
    // Calculate average monthly round-ups from patterns
    return userProfile.spendingPatterns.reduce(
      (sum, pattern) => sum + pattern.averageAmount * pattern.roundUpFrequency,
      0
    ) * 30; // Rough monthly estimate
  }

  private calculateTotalInvested(userProfile: UserProfile): number {
    return userProfile.investmentHistory.reduce(
      (sum, investment) => sum + investment.amount,
      0
    );
  }

  private getDefaultStrategy(riskTolerance: string): any {
    // Return default investment strategy based on risk tolerance
    return {
      strategy: `Balanced ${riskTolerance} approach`,
      allocation: {
        stable: riskTolerance === 'conservative' ? 70 : 40,
        growth: riskTolerance === 'aggressive' ? 60 : 30,
        speculative: riskTolerance === 'aggressive' ? 30 : 10
      },
      reasoning: ['Diversified approach', 'Risk-appropriate allocation'],
      timeline: '3-6 months'
    };
  }

  private extractActionsFromResponse(response: string): Array<{ type: string; data: any }> {
    const actions: Array<{ type: string; data: any }> = [];
    
    // Simple action extraction - could be more sophisticated
    if (response.includes('recommend') && response.includes('pool')) {
      actions.push({
        type: 'pool_recommendation',
        data: { suggestion: 'Consider Jupiter USDC-SOL LP' }
      });
    }
    
    if (response.includes('risk') && response.includes('high')) {
      actions.push({
        type: 'risk_warning',
        data: { level: 'high', message: 'High risk detected' }
      });
    }
    
    return actions;
  }

  private checkAmountAnomaly(userProfile: UserProfile, amount: number): {
    flagged: boolean;
    score: number;
    reason: string;
  } {
    // Check if transaction amount is unusual for this user
    const avgAmount = userProfile.spendingPatterns.reduce(
      (sum, p) => sum + p.averageAmount, 0
    ) / Math.max(userProfile.spendingPatterns.length, 1);
    
    const isAnomaly = amount > avgAmount * 5; // 5x normal
    
    return {
      flagged: isAnomaly,
      score: isAnomaly ? 0.8 : 0.1,
      reason: 'Unusually large transaction amount'
    };
  }

  private checkMerchantPattern(userProfile: UserProfile, merchantUrl: string): {
    flagged: boolean;
    score: number;
    reason: string;
  } {
    // Check if merchant is unusual for this user
    // This would analyze merchant patterns from history
    return {
      flagged: false,
      score: 0.1,
      reason: 'Unknown merchant'
    };
  }

  private checkTimingPattern(userProfile: UserProfile, timestamp: Date): {
    flagged: boolean;
    score: number;
    reason: string;
  } {
    // Check if timing is unusual (e.g., 3 AM transaction when user usually shops during day)
    const hour = timestamp.getHours();
    const isUnusualTime = hour < 6 || hour > 23;
    
    return {
      flagged: isUnusualTime,
      score: isUnusualTime ? 0.6 : 0.1,
      reason: 'Transaction at unusual time'
    };
  }

  private checkVelocityPattern(userId: string, timestamp: Date): {
    flagged: boolean;
    score: number;
    reason: string;
  } {
    // Check transaction velocity (too many transactions in short time)
    // This would check recent transaction history
    return {
      flagged: false,
      score: 0.1,
      reason: 'Normal transaction velocity'
    };
  }

  private async getPoolData(poolId: string): Promise<any> {
    // Fetch pool data - placeholder
    return {
      id: poolId,
      liquidity: 1000000,
      apy: 8.5,
      volatility: 0.15
    };
  }
}