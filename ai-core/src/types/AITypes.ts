// Enhanced AI types for PocketLP intelligent agent system

export interface AIContext {
  userProfile: UserProfile;
  operation: any;
  marketData: MarketData;
  conversationHistory: ConversationMessage[];
  agentId: string;
  timestamp: number;
}

export interface UserProfile {
  userId: string;
  riskTolerance: number; // 0-1 scale
  experienceLevel: number; // 1-5 scale
  investmentAmount: number;
  timeHorizon: number; // days
  totalInvested: number;
  diversificationRatio: number;
  goals: InvestmentGoal[];
  preferences: UserPreferences;
}

export interface InvestmentGoal {
  type: 'savings' | 'retirement' | 'education' | 'house' | 'emergency';
  targetAmount: number;
  timeframe: number; // days
  priority: number; // 1-5 scale
}

export interface UserPreferences {
  autoInvest: boolean;
  maxSingleInvestment: number;
  preferredAssets: string[];
  riskThreshold: number;
  notifications: NotificationSettings;
  confidence?: number;
}

export interface NotificationSettings {
  priceAlerts: boolean;
  yieldChanges: boolean;
  riskWarnings: boolean;
  goalProgress: boolean;
  marketUpdates: boolean;
}

export interface MarketData {
  totalValueLocked: number;
  volume24h: number;
  priceChange24h: number;
  volatility: number;
  liquidityDepth: number;
  tradingPairs: number;
  marketCap: number;
  correlationRisk: number;
  timestamp: number;
}

export interface PredictionResult {
  value: number;
  confidence: number;
  insights: string;
  timestamp: number;
  factors: string[];
  timeframe?: string;
  methodology?: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  score: number; // 0-1 scale
  factors: string[];
  recommendations: string[];
  mitigation: string[];
  breakdown?: {
    market: number;
    liquidity: number;
    protocol: number;
    concentration: number;
  };
}

export interface AgentDecision {
  action: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
  timestamp: number;
  metadata?: {
    modelVersion: string;
    factors: any;
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  context?: {
    intent: string;
    entities: any[];
    sentiment: number;
  };
}

export interface AgentMemory {
  userId: string;
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemory;
  learned: LearnedPatterns;
}

export interface ShortTermMemory {
  recentConversations: ConversationMessage[];
  activeContext: AIContext;
  pendingActions: PendingAction[];
  sessionData: any;
}

export interface LongTermMemory {
  userPreferences: UserPreferences;
  transactionHistory: Transaction[];
  investmentHistory: Investment[];
  goalProgress: GoalProgress[];
  riskProfile: RiskProfile;
}

export interface LearnedPatterns {
  spendingPatterns: SpendingPattern[];
  investmentPatterns: InvestmentPattern[];
  communicationStyle: CommunicationStyle;
  decisionFactors: DecisionFactor[];
}

export interface PendingAction {
  id: string;
  type: string;
  payload: any;
  scheduledFor: number;
  retryCount: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'round_up' | 'investment' | 'withdrawal';
  description: string;
  merchant?: string;
  category: string;
  timestamp: number;
  metadata: any;
}

export interface Investment {
  id: string;
  poolId: string;
  amount: number;
  entryPrice: number;
  currentValue: number;
  yield: number;
  risk: RiskAssessment;
  timestamp: number;
}

export interface GoalProgress {
  goalId: string;
  currentAmount: number;
  targetAmount: number;
  progress: number; // percentage
  estimatedCompletion: number;
  onTrack: boolean;
}

export interface RiskProfile {
  tolerance: number;
  capacity: number;
  attitude: 'conservative' | 'moderate' | 'aggressive';
  factors: string[];
  lastUpdated: number;
}

export interface SpendingPattern {
  category: string;
  frequency: number;
  avgAmount: number;
  timePattern: number[]; // hourly distribution
  merchants: string[];
  seasonal: boolean;
}

export interface InvestmentPattern {
  preferredRisk: string;
  avgInvestment: number;
  rebalanceFrequency: number;
  exitStrategy: string;
  performanceMetrics: any;
}

export interface CommunicationStyle {
  verbosity: 'brief' | 'detailed' | 'comprehensive';
  technicalLevel: 'basic' | 'intermediate' | 'advanced';
  preferredChannels: string[];
  responseTime: 'immediate' | 'batched' | 'scheduled';
}

export interface DecisionFactor {
  factor: string;
  weight: number;
  influence: 'positive' | 'negative' | 'neutral';
  context: string;
}

export interface MLModelConfig {
  name: string;
  version: string;
  architecture: any;
  hyperparameters: any;
  trainingData: TrainingDataConfig;
  performance: ModelPerformance;
}

export interface TrainingDataConfig {
  sources: string[];
  size: number;
  features: string[];
  target: string;
  splitRatio: [number, number, number]; // train, validation, test
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastEvaluated: number;
  benchmarks: any;
}

export interface PortfolioOptimization {
  allocation: AssetAllocation[];
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  diversificationScore: number;
  rebalanceSignal: boolean;
}

export interface AssetAllocation {
  asset: string;
  percentage: number;
  currentValue: number;
  targetValue: number;
  deviation: number;
}

export interface MarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral';
  score: number; // -1 to 1
  sources: SentimentSource[];
  confidence: number;
  trending: string[];
  analysis: string;
}

export interface SentimentSource {
  source: string;
  weight: number;
  sentiment: number;
  reliability: number;
}

export interface FraudDetection {
  riskScore: number; // 0-1
  anomalies: Anomaly[];
  patterns: string[];
  recommendations: string[];
  confidence: number;
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: number;
  relatedTransactions: string[];
}

export interface YieldOptimization {
  currentYield: number;
  optimizedYield: number;
  improvement: number;
  strategy: OptimizationStrategy;
  risks: string[];
  timeline: string;
}

export interface OptimizationStrategy {
  type: string;
  steps: string[];
  requiredActions: RequiredAction[];
  expectedOutcome: any;
}

export interface RequiredAction {
  action: string;
  priority: number;
  deadline?: number;
  dependencies: string[];
}

export interface AgentCoordination {
  agentId: string;
  capabilities: string[];
  currentLoad: number;
  availability: boolean;
  specializations: string[];
  collaborations: AgentCollaboration[];
}

export interface AgentCollaboration {
  partnerAgent: string;
  taskType: string;
  successRate: number;
  avgResponseTime: number;
  lastInteraction: number;
}

export interface ProactiveInsight {
  id: string;
  type: string;
  title: string;
  content: string;
  priority: number;
  relevanceScore: number;
  actionable: boolean;
  expiresAt: number;
  metadata: any;
}