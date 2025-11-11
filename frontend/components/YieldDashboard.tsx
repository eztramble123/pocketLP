'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Wallet, DollarSign, Activity, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { defiAgent, tapAgent } from '../lib/api';
import { SkeletonCard, SkeletonChart, SkeletonList } from './ui/LoadingSkeleton';
import { InlineError } from './ui/ErrorBoundary';
import { formatCurrency, formatPercentage, getChangeColor, getChangeIcon, cn } from '../lib/utils';
import RoundUpDetailsModal from './RoundUpDetailsModal';

interface YieldDashboardProps {
  userId?: string;
  key?: number;
}

interface DashboardData {
  balance: {
    totalRoundUps: number;
    totalDeposited: number;
    currentYield: number;
    lpPositions: Array<{
      poolId: string;
      poolName: string;
      amount: number;
      apy: number;
      value: number;
    }>;
  };
  roundUps: {
    roundUps: Array<{
      transactionId: string;
      originalAmount: number;
      roundUpAmount: number;
      accumulatedTotal: number;
      timestamp?: number;
      merchant?: string;
      signature?: {
        'Signature-Input': string;
        'Signature': string;
      };
      tapDetails?: {
        keyId: string;
        publicKey: string;
        nonce: string;
        verified: boolean;
        authority: string;
        method: string;
        path: string;
      };
    }>;
    totalAccumulated: number;
  };
  pools: {
    pools: Array<{
      poolId: string;
      poolName: string;
      protocol: string;
      apy: number;
      tvl: number;
      risk: string;
      tokens: string[];
    }>;
  };
}

export default function YieldDashboard({ userId = 'demo-user' }: YieldDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRoundUp, setSelectedRoundUp] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [balanceData, roundUpsData, poolsData] = await Promise.all([
        defiAgent.getUserBalance(userId),
        tapAgent.getUserRoundUps(userId, 20),
        defiAgent.getPools()
      ]);

      // Calculate totals from round-ups data
      const totalRoundUps = roundUpsData.roundUps?.reduce((sum, roundUp) => sum + roundUp.roundUpAmount, 0) || 0;
      const totalAccumulated = roundUpsData.totalAccumulated || totalRoundUps;
      
      // Calculate deposited amount (assume deposits happen at $10 threshold)
      const totalDeposited = Math.floor(totalAccumulated / 10) * 10;
      
      // Calculate current yield (simulate 5-8% APY on deposited amount)
      const currentYield = totalDeposited * (Math.random() * 0.03 + 0.05) / 12; // Monthly yield

      setData({
        balance: balanceData.balance || {
          totalRoundUps: totalAccumulated,
          totalDeposited: totalDeposited,
          currentYield: currentYield,
          lpPositions: []
        },
        roundUps: roundUpsData,
        pools: poolsData
      });
    } catch (err: any) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoundUpClick = (roundUp: any) => {
    // Enhance round-up data with mock TAP details for demo
    const enhancedRoundUp = {
      ...roundUp,
      timestamp: Date.now() - Math.random() * 86400000, // Random timestamp within last day
      merchant: 'example-store.com',
      signature: {
        'Signature-Input': 'sig1=("@method" "@authority" "@path");keyid="tap-agent-001";alg="ed25519"',
        'Signature': 'sig1=:MEUCIQDKz8F1xQDj9VoVHhK4YjCJ8k7L9cBpD1wZ2qN3mR5vXwIgY8sT6fR4uP2lE9qA3mN7kL1zX8vB6oD4wQ5nC2jF7gE:'
      },
      tapDetails: {
        keyId: 'tap-agent-001',
        publicKey: 'Ed25519VerifyKey2018',
        nonce: Math.random().toString(36).substring(2, 15),
        verified: true,
        authority: 'PocketLP TAP Agent',
        method: 'POST',
        path: '/api/tap/purchase'
      }
    };
    setSelectedRoundUp(enhancedRoundUp);
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [userId]);

  // Listen for custom purchase events to refresh data immediately
  useEffect(() => {
    const handlePurchaseEvent = () => {
      fetchDashboardData();
    };

    window.addEventListener('purchaseCompleted', handlePurchaseEvent);
    return () => window.removeEventListener('purchaseCompleted', handlePurchaseEvent);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  // Generate chart data from recent round-ups
  const chartData = data.roundUps.roundUps.slice(0, 10).reverse().map((roundUp, index) => ({
    transaction: index + 1,
    amount: roundUp.roundUpAmount,
    accumulated: roundUp.accumulatedTotal
  }));

  const poolChartData = data.pools.pools.slice(0, 5).map(pool => ({
    name: pool.protocol,
    apy: pool.apy,
    tvl: pool.tvl / 1000000 // Convert to millions
  }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Round-ups</p>
              <p className="text-2xl font-bold text-gray-900">
                ${data.balance.totalRoundUps.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Deposited</p>
              <p className="text-2xl font-bold text-gray-900">
                ${data.balance.totalDeposited.toFixed(2)}
              </p>
            </div>
            <Wallet className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Yield</p>
              <p className="text-2xl font-bold text-gray-900">
                ${data.balance.currentYield.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Positions</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.balance.lpPositions.length}
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Round-up Accumulation Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Round-up History</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="transaction" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `$${value.toFixed(2)}`,
                    name === 'amount' ? 'Round-up' : 'Total'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="accumulated" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="accumulated"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-250 text-gray-500">
              No round-up data available
            </div>
          )}
        </div>

        {/* Pool APY Comparison */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Available Pools</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={poolChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'apy' ? `${value}%` : `$${value}M`,
                  name === 'apy' ? 'APY' : 'TVL'
                ]}
              />
              <Bar dataKey="apy" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions and Pool List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Recent Round-ups</h3>
            <p className="text-xs text-gray-500 mt-1">Click on any round-up to view TAP validation details</p>
          </div>
          <div className="p-6">
            {data.roundUps.roundUps.length > 0 ? (
              <div className="max-h-80 overflow-y-auto space-y-3 pr-2" style={{scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6'}}>
                {data.roundUps.roundUps.map((roundUp, index) => (
                  <div 
                    key={index} 
                    onClick={() => handleRoundUpClick(roundUp)}
                    className="flex justify-between items-center py-3 px-3 border border-gray-100 rounded-lg hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-all duration-200 group"
                  >
                    <div>
                      <p className="text-sm font-medium group-hover:text-green-700">${roundUp.originalAmount.toFixed(2)} purchase</p>
                      <p className="text-xs text-gray-500">+${roundUp.roundUpAmount.toFixed(2)} round-up</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${roundUp.accumulatedTotal.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">total</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No transactions yet</p>
            )}
          </div>
        </div>

        {/* Pool List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Best Yield Pools</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.pools.pools.slice(0, 5).map((pool) => (
                <div key={pool.poolId} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{pool.poolName}</p>
                    <p className="text-xs text-gray-500">{pool.protocol} • {pool.risk} Risk</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{pool.apy}% APY</p>
                    <p className="text-xs text-gray-500">${(pool.tvl / 1000000).toFixed(1)}M TVL</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Round-up Details Modal */}
      <RoundUpDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roundUp={selectedRoundUp}
      />
    </div>
  );
}