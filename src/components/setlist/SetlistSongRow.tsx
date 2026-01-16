// src/components/setlist/SetlistSongRow.tsx
'use client';

import { Song } from '@/lib/types';

interface SetlistSongRowProps {
  song: Song;
  index: number;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export default function SetlistSongRow({
  song,
  index,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
}: SetlistSongRowProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`bg-primary-alt border-2 rounded-lg p-4 flex items-center gap-4 cursor-move transition-all ${
        isDragging
          ? 'border-secondary opacity-50 scale-[1.02]'
          : 'border-gray-dark hover:border-secondary'
      }`}
    >
      {/* Drag handle */}
      <div className="text-gray-light flex-shrink-0">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>

      {/* Index number */}
      <div className="w-8 h-8 rounded-full bg-gray-dark flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-white">{index + 1}</span>
      </div>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white truncate">{song.song_name}</h3>
        <p className="text-sm text-gray-light">
          {song.key && `Key: ${song.key}`}
          {song.key && song.bpm && ' • '}
          {song.bpm && `${song.bpm} BPM`}
          {song.time_signature && ` • ${song.time_signature}`}
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-2 text-gray-light hover:text-red-500 hover:bg-gray-dark rounded transition-colors flex-shrink-0"
        title="Remove from setlist"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}
