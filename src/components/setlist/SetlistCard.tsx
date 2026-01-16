// src/components/setlist/SetlistCard.tsx
'use client';

import { SetlistData } from '@/lib/types';
import { generateShareUrl } from '@/lib/setlist/sharing';

interface SetlistCardProps {
  setlist: SetlistData;
  onEdit: () => void;
  onDelete: () => void;
  onPlay: () => void;
}

export default function SetlistCard({
  setlist,
  onEdit,
  onDelete,
  onPlay,
}: SetlistCardProps) {
  const handleShare = async () => {
    const url = generateShareUrl(setlist.name, setlist.songSlugs);
    try {
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard!');
    } catch {
      // Fallback for older browsers
      prompt('Copy this link to share:', url);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-primary-alt border-2 border-gray-dark hover:border-secondary rounded-lg p-4 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-white truncate">
            {setlist.name}
          </h3>
          <p className="text-sm text-gray-light">
            {setlist.songSlugs.length} song
            {setlist.songSlugs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="p-2 text-gray-light hover:text-primary hover:bg-gray-dark rounded transition-colors"
            title="Share setlist"
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
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 text-gray-light hover:text-primary hover:bg-gray-dark rounded transition-colors"
            title="Edit setlist"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-gray-light hover:text-red-500 hover:bg-gray-dark rounded transition-colors"
            title="Delete setlist"
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
      </div>

      {/* Date info */}
      <p className="text-xs text-gray-light mb-4">
        Updated {formatDate(setlist.updated_at)}
      </p>

      {/* Play button */}
      <button
        onClick={onPlay}
        disabled={setlist.songSlugs.length === 0}
        className="w-full bg-secondary hover:bg-secondary-bold disabled:bg-gray-dark disabled:cursor-not-allowed text-primary disabled:text-gray-light py-3 rounded-lg font-semibold transition-colors"
      >
        {setlist.songSlugs.length === 0
          ? 'No Songs Yet'
          : 'Practice with Mixer'}
      </button>
    </div>
  );
}
