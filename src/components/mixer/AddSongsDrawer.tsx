// src/components/mixer/AddSongsDrawer.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Song } from '@/lib/types';
import { fetchAllSongs } from '@/lib/api/wordpress';
import { addToQueue } from '@/lib/storage/queue';
import { useDownloadStore } from '@/store/useDownloadStore';

interface AddSongsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentQueueSlugs: string[];
  onSongAdded: () => void;
}

export default function AddSongsDrawer({
  isOpen,
  onClose,
  currentQueueSlugs,
  onSongAdded,
}: AddSongsDrawerProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addedSlugs, setAddedSlugs] = useState<Set<string>>(new Set());

  const cacheStatus = useDownloadStore((state) => state.cacheStatus);
  const checkMultipleCacheStatus = useDownloadStore((state) => state.checkMultipleCacheStatus);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setSearchQuery('');
    setAddedSlugs(new Set());

    fetchAllSongs()
      .then((allSongs) => {
        setSongs(allSongs);
        checkMultipleCacheStatus(allSongs.map((s) => s.id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen]);

  const filteredSongs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return songs.filter((s) => s.song_name.toLowerCase().includes(q));
  }, [songs, searchQuery]);

  const inQueue = (slug: string) =>
    currentQueueSlugs.includes(slug) || addedSlugs.has(slug);

  const handleAdd = async (song: Song) => {
    await addToQueue([song.slug]);
    setAddedSlugs((prev) => new Set(prev).add(song.slug));
    onSongAdded();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-primary-alt z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-dark flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-light uppercase">Add Songs to Queue</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-dark transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-dark flex-shrink-0">
        <input
          type="text"
          placeholder="🔍 Search songs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          className="w-full bg-gray-dark text-white px-3 py-2 rounded-lg text-sm placeholder-gray-light focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      {/* Song list */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredSongs.length === 0 ? (
          <p className="text-sm text-gray-light italic text-center py-8">
            {searchQuery ? `No songs match "${searchQuery}"` : 'No songs found'}
          </p>
        ) : (
          <div className="space-y-1">
            {filteredSongs.map((song) => {
              const already = inQueue(song.slug);
              const cached = cacheStatus[song.id] === 'cached';

              return (
                <div
                  key={song.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-dark/50 hover:bg-gray-dark transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{song.song_name}</p>
                    <p className="text-xs text-gray-light">
                      {cached ? '✅ Downloaded' : `☁️ ${song.total_size_mb.toFixed(1)} MB`}
                      {song.bpm ? ` · ${song.bpm} BPM` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => !already && handleAdd(song)}
                    disabled={already}
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      already
                        ? 'bg-green-700 text-white cursor-default'
                        : 'bg-secondary hover:bg-secondary-bold text-primary'
                    }`}
                    aria-label={already ? 'Already in queue' : `Add ${song.song_name}`}
                  >
                    {already ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
