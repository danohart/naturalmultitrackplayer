'use client';

import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Listen for install prompt (Android/Chrome)
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  // Don't show if already installed
  if (isStandalone) return null;

  // Don't show if dismissed before
  if (typeof window !== 'undefined' && localStorage.getItem('installPromptDismissed')) {
    return null;
  }

  // iOS instructions
  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-20 left-4 right-4 bg-primary-alt border-2 border-secondary rounded-lg p-4 shadow-2xl z-50 md:left-auto md:right-4 md:w-96">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-light hover:text-white"
        >
          ✕
        </button>
        <h3 className="font-bold text-primary mb-2">Install Natural Mixer</h3>
        <p className="text-sm text-gray-light mb-3">
          Install this app on your iPad for the best experience:
        </p>
        <ol className="text-sm text-gray-light space-y-1 mb-3">
          <li>1. Tap the <strong>Share</strong> button</li>
          <li>2. Scroll and tap <strong>"Add to Home Screen"</strong></li>
          <li>3. Tap <strong>Add</strong></li>
        </ol>
        <button
          onClick={handleDismiss}
          className="w-full bg-secondary text-primary py-2 rounded font-semibold"
        >
          Got it
        </button>
      </div>
    );
  }

  // Android/Chrome install prompt
  if (showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 bg-primary-alt border-2 border-secondary rounded-lg p-4 shadow-2xl z-50 md:left-auto md:right-4 md:w-96">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-light hover:text-white"
        >
          ✕
        </button>
        <h3 className="font-bold text-primary mb-2">Install Natural Mixer</h3>
        <p className="text-sm text-gray-light mb-3">
          Install this app for quick access and offline use
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-secondary text-primary py-2 rounded font-semibold"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-dark text-white py-2 rounded"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  return null;
}

