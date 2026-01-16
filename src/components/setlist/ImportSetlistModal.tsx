// src/components/setlist/ImportSetlistModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchSongsBySlugs } from '@/lib/api/wordpress';
import { Song } from '@/lib/types';

interface ImportSetlistModalProps {
  name: string;
  slugs: string[];
  isOpen: boolean;
  onClose: () => void;
  onImport: (name: string, slugs: string[]) => void;
}

export default function ImportSetlistModal({
  name,
  slugs,
  isOpen,
  onClose,
  onImport,
}: ImportSetlistModalProps) {
  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<Song[]>([]);
  const [missingSlugs, setMissingSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && slugs.length > 0) {
      loadSongs();
    }
  }, [isOpen, slugs]);

  const loadSongs = async () => {
    try {
      setLoading(true);
      const result = await fetchSongsBySlugs(slugs);
      setSongs(result.songs);
      setMissingSlugs(result.missingSlugs);
    } catch (error) {
      console.error('Failed to load songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    // Only import the slugs that exist
    const validSlugs = slugs.filter((slug) => !missingSlugs.includes(slug));
    onImport(name, validSlugs);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-primary-alt border-2 border-gray-dark rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-dark flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Import Setlist</h2>
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

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-gray-light mb-4">
            Someone shared a setlist with you:
          </p>

          <div className="bg-primary rounded-lg p-4 mb-4">
            <h3 className="font-bold text-lg text-white mb-2">{name}</h3>
            <p className="text-sm text-gray-light">
              {slugs.length} song{slugs.length !== 1 ? 's' : ''}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-light text-sm">Loading songs...</p>
            </div>
          ) : (
            <>
              {/* Song preview */}
              <div className="space-y-2 mb-4">
                {songs.map((song, index) => (
                  <div
                    key={song.slug}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="text-gray-light w-6 text-right">
                      {index + 1}.
                    </span>
                    <span className="text-white">{song.song_name}</span>
                  </div>
                ))}
              </div>

              {/* Warning for missing songs */}
              {missingSlugs.length > 0 && (
                <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-4">
                  <p className="text-yellow-500 text-sm">
                    {missingSlugs.length} song
                    {missingSlugs.length !== 1 ? 's' : ''} could not be found
                    and will be skipped.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-dark flex-shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-dark hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || songs.length === 0}
              className="flex-1 bg-secondary hover:bg-secondary-bold disabled:bg-gray-dark disabled:cursor-not-allowed text-primary disabled:text-gray-light py-3 rounded-lg font-semibold transition-colors"
            >
              Import Setlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
