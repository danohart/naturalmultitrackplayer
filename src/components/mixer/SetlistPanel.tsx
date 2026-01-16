// src/components/mixer/SetlistPanel.tsx
'use client';

import Link from 'next/link';
import { HydratedSetlist } from '@/lib/types';

interface SetlistPanelProps {
  setlist: HydratedSetlist | null;
  currentIndex: number;
  onSongSelect: (index: number) => void;
}

export default function SetlistPanel({
  setlist,
  currentIndex,
  onSongSelect,
}: SetlistPanelProps) {
  if (!setlist) {
    return (
      <div className="flex-1 p-4 border-t border-gray-dark">
        <h2 className="text-sm font-semibold text-gray-light uppercase mb-2">
          Setlist
        </h2>
        <p className="text-sm text-gray-light italic mb-3">
          No setlist loaded.
        </p>
        <Link
          href="/setlist"
          className="block text-center bg-gray-dark hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          View Setlists
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col border-t border-gray-dark min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-light uppercase">
            {setlist.name}
          </h2>
          <span className="text-xs text-gray-light">
            Song {currentIndex + 1} of {setlist.songs.length}
          </span>
        </div>
        <Link
          href={`/setlist/${setlist.id}`}
          className="text-xs text-gray-light hover:text-white transition-colors"
          title="Edit setlist"
        >
          Edit
        </Link>
      </div>

      {/* Song list */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <div className="space-y-1">
          {setlist.songs.map((song, index) => (
            <button
              key={song.slug}
              onClick={() => onSongSelect(index)}
              className={`w-full text-left p-2 rounded-lg transition-colors flex items-center gap-2 ${
                index === currentIndex
                  ? 'bg-secondary text-primary font-semibold'
                  : 'bg-gray-dark/50 hover:bg-gray-dark text-white'
              }`}
            >
              <span
                className={`text-xs font-mono w-5 ${
                  index === currentIndex ? 'text-primary' : 'text-gray-light'
                }`}
              >
                {index + 1}.
              </span>
              <span className="truncate text-sm">{song.song_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-2 p-4 pt-2">
        <button
          onClick={() => onSongSelect(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="flex-1 bg-gray-dark hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onSongSelect(currentIndex + 1)}
          disabled={currentIndex >= setlist.songs.length - 1}
          className="flex-1 bg-gray-dark hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Next
        </button>
      </div>

      {/* Missing songs warning */}
      {setlist.missingSlugs.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs text-yellow-500">
            {setlist.missingSlugs.length} song
            {setlist.missingSlugs.length !== 1 ? 's' : ''} unavailable
          </p>
        </div>
      )}
    </div>
  );
}
