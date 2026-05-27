// src/components/mixer/QueueSongRow.tsx
'use client';

import { Song } from '@/lib/types';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QueueSongRowProps {
  song: Song;
  index: number;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  isDraggable?: boolean;
  isEditMode?: boolean;
  onRemove?: () => void;
}

export default function QueueSongRow({
  song,
  index,
  isActive,
  onClick,
  disabled = false,
  isDraggable = true,
  isEditMode = false,
  onRemove,
}: QueueSongRowProps) {
  const cacheStatus = useDownloadStore((state) => state.cacheStatus[song.id]);
  const progress = useDownloadStore((state) => state.progress[song.id]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: song.id,
    disabled: !isDraggable || disabled || isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Cache status badge
  const renderCacheBadge = () => {
    if (cacheStatus === 'cached') {
      return (
        <span className="text-green-500 text-xs" title="Downloaded">
          ✓
        </span>
      );
    }

    if (cacheStatus === 'downloading') {
      return (
        <span className="text-blue-400 text-xs" title={`Downloading ${progress}%`}>
          ⬇️ {progress}%
        </span>
      );
    }

    if (cacheStatus === 'error') {
      return (
        <span className="text-red-500 text-xs" title="Download failed">
          ✗
        </span>
      );
    }

    // not-cached or undefined
    return (
      <span className="text-gray-light text-xs" title="Not downloaded">
        ☁️ {song.total_size_mb.toFixed(1)}MB
      </span>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isEditMode ? {} : listeners)}
      className={`select-none flex items-center gap-2 ${isDragging ? 'z-50' : ''}`}
    >
      {/* Remove button (edit mode only) */}
      {isEditMode && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
          aria-label={`Remove ${song.song_name} from queue`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <button
        onClick={isEditMode ? undefined : onClick}
        disabled={disabled && !isEditMode}
        className={`flex-1 text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
          isEditMode
            ? 'bg-gray-dark/50 text-white cursor-default'
            : isActive
            ? 'bg-secondary text-primary font-semibold'
            : 'bg-gray-dark/50 hover:bg-gray-dark text-white disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {/* Index number */}
        <span
          className={`text-sm font-mono w-5 flex-shrink-0 ${
            isActive && !isEditMode ? 'text-primary' : 'text-gray-light'
          }`}
        >
          {index + 1}.
        </span>

        {/* Song name */}
        <span className="truncate text-sm flex-1">{song.song_name}</span>

        {/* Cache status badge */}
        {!isEditMode && <span className="flex-shrink-0">{renderCacheBadge()}</span>}
      </button>
    </div>
  );
}
