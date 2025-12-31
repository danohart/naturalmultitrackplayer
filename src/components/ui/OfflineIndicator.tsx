// src/components/ui/OfflineIndicator.tsx
'use client';

import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useEffect, useState } from 'react';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
    } else {
      // Delay hiding to show "Back online" message briefly
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!show) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg transition-all ${
        isOnline
          ? 'bg-green-600 text-white'
          : 'bg-secondary-bold text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <span className="text-xl">✓</span>
            <span className="font-semibold">Back online</span>
          </>
        ) : (
          <>
            <span className="text-xl">⚠️</span>
            <span className="font-semibold">You're offline</span>
          </>
        )}
      </div>
    </div>
  );
}
