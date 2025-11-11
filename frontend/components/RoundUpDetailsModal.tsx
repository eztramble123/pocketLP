'use client';

import { useState } from 'react';
import { X, Copy, CheckCircle, Shield, Clock, CreditCard, Eye, EyeOff } from 'lucide-react';

interface RoundUpDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundUp: {
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
  };
}

export default function RoundUpDetailsModal({ isOpen, onClose, roundUp }: RoundUpDetailsModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
              <p className="text-sm text-gray-500">Round-up Transaction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Transaction Summary */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Original Purchase</p>
                <p className="text-2xl font-bold text-gray-900">${roundUp.originalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Round-up Amount</p>
                <p className="text-2xl font-bold text-green-600">+${roundUp.roundUpAmount.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Accumulated</span>
                <span className="text-lg font-semibold text-gray-900">${roundUp.accumulatedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Transaction Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Transaction ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                    {roundUp.transactionId.slice(0, 16)}...
                  </code>
                  <button
                    onClick={() => copyToClipboard(roundUp.transactionId, 'txId')}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {copied === 'txId' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Timestamp</label>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{formatTimestamp(roundUp.timestamp)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Merchant</label>
                <p className="text-sm text-gray-600 mt-1">{roundUp.merchant || 'example-store.com'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-700">Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* TAP Protocol Details */}
          <div className="border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">TAP Protocol Signature</h3>
                    <p className="text-xs text-gray-600">Trusted Agent Protocol Validation</p>
                  </div>
                </div>
                {roundUp.tapDetails?.verified && (
                  <div className="flex items-center gap-2 text-green-700 bg-green-100 px-2 py-1 rounded-full">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Verified</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Key Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Key ID</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {roundUp.tapDetails?.keyId?.slice(0, 12) || 'tap-agent-001'}...
                    </code>
                    <button
                      onClick={() => copyToClipboard(roundUp.tapDetails?.keyId || 'tap-agent-001', 'keyId')}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {copied === 'keyId' ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Authority</label>
                  <p className="text-xs text-gray-600 mt-1">{roundUp.tapDetails?.authority || 'PocketLP TAP Agent'}</p>
                </div>
              </div>

              {/* Request Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Method</label>
                  <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {roundUp.tapDetails?.method || 'POST'}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Path</label>
                  <code className="block text-xs text-gray-600 mt-1">{roundUp.tapDetails?.path || '/api/tap/purchase'}</code>
                </div>
              </div>

              {/* Technical Details Toggle */}
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {showTechnicalDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
              </button>

              {/* Technical Details */}
              {showTechnicalDetails && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Signature Input</label>
                    <div className="mt-1">
                      <code className="block text-xs bg-gray-100 p-3 rounded font-mono break-all">
                        {roundUp.signature?.['Signature-Input'] || 'sig1=(\"@method\" \"@authority\" \"@path\");keyid=\"tap-agent-001\";alg=\"ed25519\"'}
                      </code>
                      <button
                        onClick={() => copyToClipboard(roundUp.signature?.['Signature-Input'] || '', 'sigInput')}
                        className="mt-2 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                      >
                        {copied === 'sigInput' ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        Copy Signature Input
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Ed25519 Signature</label>
                    <div className="mt-1">
                      <code className="block text-xs bg-gray-100 p-3 rounded font-mono break-all">
                        {roundUp.signature?.['Signature'] || 'sig1=:MEUCIQDKz8...truncated...example:'}
                      </code>
                      <button
                        onClick={() => copyToClipboard(roundUp.signature?.['Signature'] || '', 'signature')}
                        className="mt-2 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                      >
                        {copied === 'signature' ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        Copy Signature
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Public Key</label>
                    <div className="mt-1">
                      <code className="block text-xs bg-gray-100 p-3 rounded font-mono break-all">
                        {roundUp.tapDetails?.publicKey || 'Ed25519 public key (base58 encoded)'}
                      </code>
                      <button
                        onClick={() => copyToClipboard(roundUp.tapDetails?.publicKey || '', 'pubKey')}
                        className="mt-2 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                      >
                        {copied === 'pubKey' ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        Copy Public Key
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}