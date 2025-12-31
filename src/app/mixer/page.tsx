// src/app/mixer/page.tsx
'use client';

import { Suspense } from 'react';
import MixerContent from '@/components/mixer/MixerContent';

export default function MixerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-lightest flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading mixer...</p>
          </div>
        </div>
      }
    >
      <MixerContent />
    </Suspense>
  );
}