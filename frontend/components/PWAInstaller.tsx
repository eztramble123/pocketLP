'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installStep, setInstallStep] = useState<'prompt' | 'installing' | 'success'>('prompt');

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Save the event for later use
      setDeferredPrompt(event);
      // Show our custom install prompt
      setShowInstallPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setInstallStep('installing');
    
    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user response
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setInstallStep('success');
        setTimeout(() => {
          setShowInstallPrompt(false);
        }, 2000);
      } else {
        console.log('User dismissed the install prompt');
        setInstallStep('prompt');
        setShowInstallPrompt(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during installation:', error);
      setInstallStep('prompt');
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed, dismissed, or no prompt available
  if (isInstalled || !showInstallPrompt || !deferredPrompt) {
    return null;
  }

  // Check if user already dismissed in this session
  if (sessionStorage.getItem('pwa-install-dismissed') === 'true') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="card-premium p-4 shadow-xl border-primary-200 bg-gradient-to-r from-primary-50 to-success-50">
        {installStep === 'prompt' && (
          <>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-white" />
              </div>
              
              <div className="flex-1">
                <h4 className="font-semibold text-neutral-800 mb-1">
                  Install PocketLP App
                </h4>
                <p className="text-sm text-neutral-600 mb-3">
                  Get faster access and offline capabilities. Install our app for the best experience.
                </p>
                
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
                  <Smartphone className="w-3 h-3" />
                  <span>Works on mobile & desktop</span>
                  <Monitor className="w-3 h-3 ml-2" />
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className="p-1 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleInstallClick}
                className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2 flex-1"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
            </div>
          </>
        )}
        
        {installStep === 'installing' && (
          <div className="text-center py-2">
            <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-3"></div>
            <p className="text-sm text-neutral-600">Installing app...</p>
          </div>
        )}
        
        {installStep === 'success' && (
          <div className="text-center py-2">
            <div className="w-8 h-8 bg-success-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Download className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-medium text-success-700">App installed successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PWAStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check if installed as PWA
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOSStandalone = (window as any).navigator.standalone;
      
      setIsInstalled(isStandalone || (isIOS && isIOSStandalone));
    };
    
    checkInstalled();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!isInstalled) return null;
  
  return (
    <div className="fixed top-4 right-4 z-40">
      <div className={`
        px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2
        ${isOnline 
          ? 'bg-success-100 text-success-700 border border-success-200' 
          : 'bg-warning-100 text-warning-700 border border-warning-200'
        }
      `}>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success-500' : 'bg-warning-500'}`} />
        {isOnline ? 'Online' : 'Offline'}
      </div>
    </div>
  );
}