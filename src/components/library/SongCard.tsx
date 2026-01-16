// src/components/library/SongCard.tsx
'use client';

import { Song } from '@/lib/types';

interface SongCardProps {
  song: Song;
  isCached: boolean;
  onClick: () => void;
  onAddToSetlist?: () => void;
}

export default function SongCard({
  song,
  isCached,
  onClick,
  onAddToSetlist,
}: SongCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-primary-alt border-2 border-gray-dark hover:border-secondary rounded-lg p-4 cursor-pointer transition-all hover:scale-105 group relative"
    >
      
      {/* Header with cached badge */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors flex-1">
          {song.song_name}
        </h3>
        {isCached && (
          <span className="ml-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
            ✓ Downloaded
          </span>
        )}
      </div>

      {/* Song metadata */}
      <div className="space-y-2 text-sm text-gray-light">
        {song.bpm && (
          <div className="flex items-center gap-2">
            <span className="text-primary">♪</span>
            <span>{song.bpm} BPM</span>
          </div>
        )}
        {song.key && (
          <div className="flex items-center gap-2">
            <span className="text-primary">♯</span>
            <span>Key: {song.key}</span>
          </div>
        )}
        {song.time_signature && (
          <div className="flex items-center gap-2">
            <span className="text-primary">⏱</span>
            <span>{song.time_signature}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-dark flex items-center justify-between text-xs">
        <span className="text-gray-light">
          {song.tracks?.length || 0} tracks
        </span>
        <span className="text-gray-light">
          {song.total_size_mb ? song.total_size_mb.toFixed(1) : '0.0'}MB
        </span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        {onAddToSetlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToSetlist();
            }}
            className="flex-1 bg-gray-dark hover:bg-gray-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          >
            + Setlist
          </button>
        )}
        <button
          onClick={onClick}
          className="flex-1 bg-secondary hover:bg-secondary-bold text-primary py-2 px-3 rounded-lg text-sm font-medium transition-colors"
        >
          Open Mixer
        </button>
      </div>
    </div>
  );
}