// src/components/mixer/CacheIncompleteError.tsx

'use client';

import { HydratedSetlist } from '@/lib/types';

interface Props {
  setlist: HydratedSetlist;
  missingCacheSongIds: number[];
  onDownloadAll: () => void;
  onBackToSetlist: () => void;
}

export default function CacheIncompleteError({
  setlist,
  missingCacheSongIds,
  onDownloadAll,
  onBackToSetlist,
}: Props) {
  const missingSongs = setlist.songs.filter((s) =>
    missingCacheSongIds.includes(s.id)
  );

  const totalSize = missingSongs.reduce((sum, s) => sum + s.total_size_mb, 0);

  return (
    <div className="fixed inset-0 bg-primary flex items-center justify-center z-50 p-4">
      <div className="max-w-lg w-full bg-primary-alt border-2 border-red-500 rounded-lg p-6">
        {/* Error icon */}
        <div className="text-center mb-4">
          <div className="text-6xl">⚠️</div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-2 text-center">
          Setlist Not Ready for Offline
        </h2>

        {/* Message */}
        <p className="text-gray-light text-center mb-4">
          {missingSongs.length} song{missingSongs.length !== 1 ? 's are' : ' is'}{' '}
          not downloaded. Download now to perform offline.
        </p>

        {/* Missing songs list */}
        <div className="bg-primary rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
          <p className="text-sm font-semibold text-gray-light mb-2">
            Missing Songs:
          </p>
          <ul className="space-y-1">
            {missingSongs.map((song) => (
              <li
                key={song.id}
                className="text-sm text-white flex items-center gap-2"
              >
                <span className="text-red-500">✕</span>
                <span>{song.song_name}</span>
                <span className="text-gray-light ml-auto">
                  {song.total_size_mb.toFixed(1)} MB
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Download info */}
        <p className="text-xs text-gray-light text-center mb-4">
          Total download size: {totalSize.toFixed(1)} MB
        </p>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onDownloadAll}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            Download All Now
          </button>

          <button
            onClick={onBackToSetlist}
            className="w-full bg-gray-dark hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            Back to Setlist
          </button>
        </div>

        {/* Warning */}
        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded">
          <p className="text-xs text-yellow-400 text-center">
            For live performance: Download all songs BEFORE going on stage
          </p>
        </div>
      </div>
    </div>
  );
}
