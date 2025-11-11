'use client';

import { Shield, Lock, CheckCircle, Eye, Award } from 'lucide-react';

export function SecurityBadge() {
  return (
    <div className="security-indicator px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
      <Shield className="w-3 h-3" />
      <span>Bank-level Security</span>
    </div>
  );
}

export function EncryptionIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-600">
      <Lock className="w-3 h-3" />
      <span>256-bit SSL Encryption</span>
    </div>
  );
}

export function VerifiedBadge() {
  return (
    <div className="trust-badge px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
      <CheckCircle className="w-3 h-3 text-success-600" />
      <span>Verified Protocol</span>
    </div>
  );
}

export function AuditedBadge() {
  return (
    <div className="flex items-center gap-1 text-xs text-success-700 bg-success-50 px-2 py-1 rounded">
      <Award className="w-3 h-3" />
      <span>Audited by Certik</span>
    </div>
  );
}

export function TransparencyIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-600">
      <Eye className="w-3 h-3" />
      <span>Fully Transparent On-Chain</span>
    </div>
  );
}

export function TrustScore({ score = 9.2 }: { score?: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-success-600';
    if (score >= 7) return 'text-warning-600';
    return 'text-error-600';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="text-xs text-neutral-600">Trust Score:</span>
        <span className={`font-mono font-semibold ${getScoreColor(score)}`}>
          {score.toFixed(1)}/10
        </span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 h-3 rounded-full ${
              i < Math.floor(score / 2) 
                ? 'bg-success-500' 
                : 'bg-neutral-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function TrustPanel() {
  return (
    <div className="card-premium p-4 space-y-3">
      <h4 className="font-medium text-sm text-neutral-800">Security & Trust</h4>
      
      <div className="space-y-2">
        <EncryptionIndicator />
        <TransparencyIndicator />
        
        <div className="flex items-center justify-between">
          <VerifiedBadge />
          <TrustScore />
        </div>
        
        <div className="pt-2 border-t border-neutral-100">
          <AuditedBadge />
        </div>
      </div>
    </div>
  );
}