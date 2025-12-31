// src/app/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-light flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-secondary mb-4">Natural Mixer</h1>
        <p className="text-gray-light text-xl mb-8">Multi-track audio mixer for live performance</p>
        <button
          onClick={() => router.push('/library')}
          className="bg-secondary hover:bg-secondary-bold text-primary px-8 py-4 rounded-lg text-xl font-semibold transition-colors"
        >
          Browse Song Library →
        </button>
      </div>
    </div>
  );
}