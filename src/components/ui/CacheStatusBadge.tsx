// src/components/ui/CacheStatusBadge.tsx

'use client';

import { useDownloadStore } from '@/store/useDownloadStore';

interface Props {
  songId: number;
  size?: 'sm' | 'md';
  showProgress?: boolean;
}

export default function CacheStatusBadge({
  songId,
  size = 'md',
  showProgress = true,
}: Props) {
  // Use separate selectors to avoid creating new objects on each render
  const cacheStatus = useDownloadStore((state) => state.cacheStatus[songId] || 'not-cached');
  const progress = useDownloadStore((state) => state.progress[songId] || 0);

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  if (cacheStatus === 'cached') {
    return (
      <span
        className={`${sizeClasses} bg-green-600 text-white rounded-full font-medium flex items-center gap-1`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Cached
      </span>
    );
  }

  if (cacheStatus === 'downloading') {
    return (
      <span
        className={`${sizeClasses} bg-blue-600 text-white rounded-full font-medium flex items-center gap-1`}
      >
        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        {showProgress && `${Math.round(progress)}%`}
      </span>
    );
  }

  if (cacheStatus === 'error') {
    return (
      <span
        className={`${sizeClasses} bg-red-600 text-white rounded-full font-medium flex items-center gap-1`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        Failed
      </span>
    );
  }

  return (
    <span
      className={`${sizeClasses} bg-gray-dark text-gray-light rounded-full font-medium flex items-center gap-1`}
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
        />
      </svg>
      Not Cached
    </span>
  );
}
