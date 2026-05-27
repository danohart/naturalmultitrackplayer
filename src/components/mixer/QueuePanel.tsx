// src/components/mixer/QueuePanel.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { HydratedSetlist } from '@/lib/types';
import { useDownloadStore } from '@/store/useDownloadStore';
import { downloadManager } from '@/lib/storage/downloadManager';
import { reorderQueue, removeFromQueue } from '@/lib/storage/queue';
import QueueSongRow from './QueueSongRow';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface QueuePanelProps {
  queue: HydratedSetlist | null;
  currentIndex: number;
  onSongSelect: (index: number) => void;
  onAddSongs?: () => void;
  onReorder?: () => void;
  isLoading?: boolean;
}

export default function QueuePanel({
  queue,
  currentIndex,
  onSongSelect,
  onAddSongs,
  onReorder,
  isLoading = false,
}: QueuePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const cacheStatus = useDownloadStore((state) => state.cacheStatus);
  const checkMultipleCacheStatus = useDownloadStore(
    (state) => state.checkMultipleCacheStatus
  );

  // Check cache status when queue loads
  useEffect(() => {
    if (queue && queue.songs.length > 0) {
      const songIds = queue.songs.map((s) => s.id);
      checkMultipleCacheStatus(songIds);
    }
    // Exit edit mode when queue becomes empty
    if (queue && queue.songs.length === 0) {
      setIsEditMode(false);
    }
  }, [queue, checkMultipleCacheStatus]);

  // Configure drag sensors for desktop and touch devices
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter and categorize songs
  const { downloadedSongs, notDownloadedSongs } = useMemo(() => {
    if (!queue) {
      return { downloadedSongs: [], notDownloadedSongs: [] };
    }

    const filtered = queue.songs.filter((song) =>
      song.song_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const downloaded = filtered.filter((s) => cacheStatus[s.id] === 'cached');
    const notDownloaded = filtered.filter((s) => cacheStatus[s.id] !== 'cached');

    return {
      downloadedSongs: downloaded,
      notDownloadedSongs: notDownloaded,
    };
  }, [queue, searchQuery, cacheStatus]);

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !queue || active.id === over.id) {
      return;
    }

    const oldIndex = queue.songs.findIndex((s) => s.id === active.id);
    const newIndex = queue.songs.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reorder array
    const newSongs = [...queue.songs];
    const [movedSong] = newSongs.splice(oldIndex, 1);
    newSongs.splice(newIndex, 0, movedSong);

    const newSlugs = newSongs.map((s) => s.slug);

    try {
      await reorderQueue(newSlugs);
      onReorder?.();
    } catch (error) {
      console.error('Failed to reorder queue:', error);
    }
  };

  // Handle remove song from queue
  const handleRemove = async (songSlug: string) => {
    await removeFromQueue(songSlug);
    onReorder?.();
  };

  // Handle Download All
  const handleDownloadAll = async () => {
    if (notDownloadedSongs.length === 0) {
      return;
    }

    const totalSize = notDownloadedSongs.reduce(
      (sum, s) => sum + s.total_size_mb,
      0
    );

    const confirmed = confirm(
      `Download ${notDownloadedSongs.length} song(s) for offline use? (${totalSize.toFixed(1)} MB)`
    );

    if (!confirmed) {
      return;
    }

    setIsDownloadingAll(true);

    try {
      await downloadManager.downloadMultipleSongs(notDownloadedSongs);
      console.log('All songs downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Some downloads failed. Please try again.');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Get song index in original queue
  const getSongIndex = (songId: number) => {
    if (!queue) return -1;
    return queue.songs.findIndex((s) => s.id === songId);
  };

  if (!queue) {
    return (
      <div className="flex-1 p-4 border-t border-gray-dark">
        <h2 className="text-sm font-semibold text-gray-light uppercase mb-2">
          Queue
        </h2>
        <p className="text-sm text-gray-light italic mb-3">
          No queue loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col border-t border-gray-dark min-h-0">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-light uppercase">
              {queue.name}
            </h2>
            <span className="text-xs text-gray-light">
              {queue.songs.length} song{queue.songs.length !== 1 ? 's' : ''}
            </span>
          </div>
          {queue.songs.length > 0 && (
            <button
              onClick={() => setIsEditMode((v) => !v)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                isEditMode
                  ? 'bg-secondary text-primary font-semibold'
                  : 'text-gray-light hover:text-white'
              }`}
            >
              {isEditMode ? 'Done' : 'Edit'}
            </button>
          )}
        </div>

        {/* Search bar */}
        <input
          type="text"
          placeholder="🔍 Search songs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-dark text-white px-3 py-2 rounded-lg text-sm placeholder-gray-light focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      {/* Song lists */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {queue.songs.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-gray-light mb-4">No songs in queue yet.</p>
            {onAddSongs && (
              <button
                onClick={onAddSongs}
                className="bg-secondary hover:bg-secondary-bold text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Add Songs
              </button>
            )}
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={queue.songs.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* Ready for Offline section */}
            {downloadedSongs.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-green-500 uppercase">
                    📱 Ready for Offline ({downloadedSongs.length})
                  </h3>
                </div>
                <div className="space-y-1">
                  {downloadedSongs.map((song) => {
                    const songIndex = getSongIndex(song.id);
                    return (
                      <QueueSongRow
                        key={song.id}
                        song={song}
                        index={songIndex}
                        isActive={songIndex === currentIndex}
                        onClick={() => onSongSelect(songIndex)}
                        disabled={isLoading && songIndex !== currentIndex}
                        isDraggable={!isLoading}
                        isEditMode={isEditMode}
                        onRemove={() => handleRemove(song.slug)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Needs Internet section */}
            {notDownloadedSongs.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-yellow-500 uppercase">
                    ⚠️ Needs Internet ({notDownloadedSongs.length})
                  </h3>
                  <button
                    onClick={handleDownloadAll}
                    disabled={isDownloadingAll}
                    className="text-xs text-gray-light hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDownloadingAll ? 'Downloading...' : 'Download All'}
                  </button>
                </div>
                <div className="space-y-1">
                  {notDownloadedSongs.map((song) => {
                    const songIndex = getSongIndex(song.id);
                    return (
                      <QueueSongRow
                        key={song.id}
                        song={song}
                        index={songIndex}
                        isActive={songIndex === currentIndex}
                        onClick={() => onSongSelect(songIndex)}
                        disabled={isLoading && songIndex !== currentIndex}
                        isDraggable={!isLoading}
                        isEditMode={isEditMode}
                        onRemove={() => handleRemove(song.slug)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state when search has no results */}
            {searchQuery &&
              downloadedSongs.length === 0 &&
              notDownloadedSongs.length === 0 && (
                <p className="text-sm text-gray-light italic text-center py-4">
                  No songs match &quot;{searchQuery}&quot;
                </p>
              )}
          </SortableContext>
        </DndContext>
      </div>

      {/* Add More Songs button */}
      {onAddSongs && (
        <div className="px-4 pb-2">
          <button
            onClick={onAddSongs}
            className="w-full bg-gray-dark hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Add More Songs
          </button>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-2 p-4 pt-2">
        <button
          onClick={() => onSongSelect(currentIndex - 1)}
          disabled={isLoading || currentIndex === 0}
          className="flex-1 bg-gray-dark hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onSongSelect(currentIndex + 1)}
          disabled={isLoading || currentIndex >= queue.songs.length - 1}
          className="flex-1 bg-gray-dark hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Next
        </button>
      </div>

      {/* Missing songs warning */}
      {queue.missingSlugs.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs text-yellow-500">
            {queue.missingSlugs.length} song
            {queue.missingSlugs.length !== 1 ? 's' : ''} unavailable
          </p>
        </div>
      )}
    </div>
  );
}
