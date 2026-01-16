// src/components/setlist/SongPickerModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchAllSongs } from '@/lib/api/wordpress';
import { Song } from '@/lib/types';

interface SongPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSongs: (slugs: string[]) => void;
  existingSlugs: string[];
}

export default function SongPickerModal({
  isOpen,
  onClose,
  onAddSongs,
  existingSlugs,
}: SongPickerModalProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadSongs();
      setSelectedSlugs(new Set());
      setSearchTerm('');
    }
  }, [isOpen]);

  const loadSongs = async () => {
    try {
      setLoading(true);
      const allSongs = await fetchAllSongs();
      setSongs(allSongs);
    } catch (error) {
      console.error('Failed to load songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = useMemo(() => {
    if (!searchTerm) return songs;
    const term = searchTerm.toLowerCase();
    return songs.filter((song) =>
      song.song_name.toLowerCase().includes(term)
    );
  }, [songs, searchTerm]);

  const toggleSong = (slug: string) => {
    const newSelected = new Set(selectedSlugs);
    if (newSelected.has(slug)) {
      newSelected.delete(slug);
    } else {
      newSelected.add(slug);
    }
    setSelectedSlugs(newSelected);
  };

  const handleAdd = () => {
    onAddSongs(Array.from(selectedSlugs));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-primary-alt border-2 border-gray-dark rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-dark flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Add Songs</h2>
          <button
            onClick={onClose}
            className="text-gray-light hover:text-white transition-colors"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-dark flex-shrink-0">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search songs..."
            className="w-full bg-primary border-2 border-gray-dark focus:border-secondary rounded-lg px-4 py-3 text-white placeholder-gray-light outline-none transition-colors"
          />
        </div>

        {/* Song List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-light text-sm">Loading songs...</p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <p className="text-center text-gray-light py-8">No songs found.</p>
          ) : (
            <div className="space-y-1">
              {filteredSongs.map((song) => {
                const isInSetlist = existingSlugs.includes(song.slug);
                const isSelected = selectedSlugs.has(song.slug);

                return (
                  <button
                    key={song.slug}
                    onClick={() => !isInSetlist && toggleSong(song.slug)}
                    disabled={isInSetlist}
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                      isInSetlist
                        ? 'bg-gray-dark/50 cursor-not-allowed opacity-50'
                        : isSelected
                        ? 'bg-secondary/20 border-2 border-secondary'
                        : 'bg-primary hover:bg-gray-dark border-2 border-transparent'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isInSetlist
                          ? 'border-gray-light bg-gray-dark'
                          : isSelected
                          ? 'border-secondary bg-secondary'
                          : 'border-gray-light'
                      }`}
                    >
                      {(isSelected || isInSetlist) && (
                        <svg
                          className={`w-3 h-3 ${
                            isInSetlist ? 'text-gray-light' : 'text-primary'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {song.song_name}
                      </p>
                      <p className="text-xs text-gray-light">
                        {song.key && `Key: ${song.key}`}
                        {song.key && song.bpm && ' • '}
                        {song.bpm && `${song.bpm} BPM`}
                        {isInSetlist && ' • Already in setlist'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-dark flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-light">
              {selectedSlugs.size} song{selectedSlugs.size !== 1 ? 's' : ''}{' '}
              selected
            </span>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="bg-gray-dark hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={selectedSlugs.size === 0}
                className="bg-secondary hover:bg-secondary-bold disabled:bg-gray-dark disabled:cursor-not-allowed text-primary disabled:text-gray-light px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Add Selected
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
