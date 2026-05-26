// src/components/ui/GlobalDownloadProgress.tsx

'use client';

import { useDownloadStore } from '@/store/useDownloadStore';

export default function GlobalDownloadProgress() {
  // Use separate selectors to avoid creating new objects on each render
  const activeDownloads = useDownloadStore((state) => state.activeDownloads);
  const progress = useDownloadStore((state) => state.progress);

  const downloadingSongs = Array.from(activeDownloads);

  if (downloadingSongs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-primary-alt border-2 border-secondary rounded-lg p-3 shadow-lg z-40 max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-white">
          Downloading {downloadingSongs.length} song
          {downloadingSongs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {downloadingSongs.slice(0, 3).map((songId) => (
        <div key={songId} className="text-xs text-gray-light mb-1">
          <div className="flex justify-between mb-1">
            <span>Song {songId}</span>
            <span>{Math.round(progress[songId] || 0)}%</span>
          </div>
          <div className="w-full bg-gray-dark rounded-full h-1">
            <div
              className="bg-secondary h-full transition-all duration-300"
              style={{ width: `${progress[songId] || 0}%` }}
            />
          </div>
        </div>
      ))}

      {downloadingSongs.length > 3 && (
        <div className="text-xs text-gray-light mt-1">
          +{downloadingSongs.length - 3} more
        </div>
      )}
    </div>
  );
}
