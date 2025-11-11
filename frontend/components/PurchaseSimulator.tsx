'use client';

import { useState } from 'react';
import { ShoppingCart, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { tapAgent } from '../lib/api';

interface PurchaseSimulatorProps {
  userId?: string;
  onPurchaseComplete?: (data: any) => void;
}

interface PurchaseResult {
  transactionId: string;
  originalAmount: number;
  roundUpAmount: number;
  accumulatedTotal: number;
  signature: any;
  thresholdReached: boolean;
}

export default function PurchaseSimulator({ 
  userId = 'demo-user',
  onPurchaseComplete 
}: PurchaseSimulatorProps) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('example-store.com');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState('');

  const handlePurchase = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResult(null);

    try {
      const purchaseAmount = parseFloat(amount);
      const merchantUrl = `https://${merchant}`;

      // Process purchase through TAP agent
      const response = await tapAgent.processPurchase({
        userId,
        amount: purchaseAmount,
        merchantUrl,
        merchantPath: '/checkout'
      });

      setResult(response);
      onPurchaseComplete?.(response);

      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('purchaseCompleted', { detail: response }));

      // Clear form
      setAmount('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process purchase');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold">Purchase Simulator</h3>
      </div>

      <div className="space-y-4">
        {/* Purchase Form */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isProcessing}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Merchant
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="store.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={isProcessing || !amount}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          {isProcessing ? 'Processing...' : 'Complete Purchase'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Purchase completed successfully!</span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Purchase Amount:</span>
                <span className="font-mono">${result.originalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Round-up Amount:</span>
                <span className="font-mono text-green-600">+${result.roundUpAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Total Accumulated:</span>
                <span className="font-mono">${result.accumulatedTotal.toFixed(2)}</span>
              </div>
              
              {result.thresholdReached && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs">
                  🎯 Threshold reached! DeFi agent will process your deposit shortly.
                </div>
              )}
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600">TAP Signature Details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto text-xs">
                {JSON.stringify(result.signature, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}