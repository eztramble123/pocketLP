'use client';

import { useState, useEffect } from 'react';
import YieldDashboard from '../components/YieldDashboard';
import PurchaseSimulator from '../components/PurchaseSimulator';
import AgentChat from '../components/AgentChat';
import { Wallet, Bot, ShoppingCart, BarChart3, Shield, Zap, TrendingUp } from 'lucide-react';
import { SecurityBadge, TrustPanel } from '../components/ui/TrustIndicators';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import PWAInstaller, { PWAStatus } from '../components/PWAInstaller';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handlePurchaseComplete = (data: any) => {
    // Refresh dashboard when purchase completes
    setRefreshKey(prev => prev + 1);
    
    // Switch to dashboard to see the update
    if (data.thresholdReached) {
      setTimeout(() => setActiveTab('dashboard'), 1000);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Wallet },
    { id: 'purchase', label: 'Purchase', icon: ShoppingCart },
    { id: 'chat', label: 'Agent Chat', icon: Bot },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/20 to-success-50/20">
        {/* Header */}
        <header className="glass-subtle sticky top-0 z-50 border-b border-neutral-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 via-primary-500 to-success-500 rounded-xl shadow-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-primary-700 to-success-600 bg-clip-text text-transparent">
                    PocketLP
                  </h1>
                  <p className="text-xs text-neutral-600 font-medium tracking-wide">
                    Smart Round-Up Investing
                  </p>
                </div>
                <div className="hidden sm:block">
                  <SecurityBadge />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-success-50 text-success-700 rounded-full text-sm font-medium border border-success-200">
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                  Twin Agents Online
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-neutral-600">
                    <Shield className="w-3 h-3 text-success-600" />
                    <span className="hidden sm:inline">Secured</span>
                  </div>
                  <div className="flex items-center gap-1 text-neutral-600">
                    <Zap className="w-3 h-3 text-warning-500" />
                    <span className="hidden sm:inline">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="card-premium p-2 mb-8">
            <nav className="flex space-x-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg transform scale-[1.02]'
                          : 'text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 active:scale-[0.98]'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className={`transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3" key={refreshKey}>
                  <YieldDashboard userId="demo-user" />
                </div>
                <div className="space-y-6">
                  <TrustPanel />
                  
                  <div className="card-premium p-4">
                    <h4 className="font-medium text-sm text-neutral-800 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-success-600" />
                      Performance
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-neutral-600">24h Change</span>
                        <span className="text-sm font-mono font-semibold text-success-600">+2.4%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-neutral-600">7d Change</span>
                        <span className="text-sm font-mono font-semibold text-success-600">+8.7%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-neutral-600">Total Return</span>
                        <span className="text-sm font-mono font-semibold text-success-600">+12.3%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'purchase' && (
              <div className="max-w-2xl mx-auto">
                <PurchaseSimulator 
                  userId="demo-user" 
                  onPurchaseComplete={handlePurchaseComplete}
                />
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="max-w-4xl mx-auto">
                <AgentChat userId="demo-user" />
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="glass-subtle border-t border-neutral-200/50 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-primary-600 to-success-500 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-3 h-3 text-white" />
                  </div>
                  <span className="font-semibold text-neutral-800">PocketLP</span>
                </div>
                <p className="text-sm text-neutral-600">
                  Transform your spare change into DeFi yields with our intelligent twin-agent system.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-neutral-800">Technology</h4>
                <div className="space-y-1 text-sm text-neutral-600">
                  <p>• Solana Agent Kit</p>
                  <p>• Visa TAP Protocol</p>
                  <p>• Bank-level Security</p>
                  <p>• Real-time Analytics</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-neutral-800">Security</h4>
                <div className="space-y-2">
                  <SecurityBadge />
                  <p className="text-xs text-neutral-600">
                    Your funds are protected by institutional-grade security and smart contract audits.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-neutral-200/50 mt-8 pt-6 text-center text-xs text-neutral-500">
              <p>&copy; 2024 PocketLP. All rights reserved. Built with Next.js and Solana.</p>
            </div>
          </div>
        </footer>
        
        {/* PWA Components */}
        <PWAInstaller />
        <PWAStatus />
      </div>
    </ErrorBoundary>
  );
}
