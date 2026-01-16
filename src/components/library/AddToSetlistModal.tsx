// src/components/library/AddToSetlistModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { getSetlists, saveSetlist } from '@/lib/storage/db';
import { SetlistData, Song } from '@/lib/types';

interface AddToSetlistModalProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToSetlistModal({
  song,
  isOpen,
  onClose,
}: AddToSetlistModalProps) {
  const [setlists, setSetlists] = useState<SetlistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSetlists();
      setCreating(false);
      setNewSetlistName('');
    }
  }, [isOpen]);

  const loadSetlists = async () => {
    try {
      setLoading(true);
      const data = await getSetlists();
      data.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setSetlists(data);
    } catch (error) {
      console.error('Failed to load setlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToSetlist = async (setlist: SetlistData) => {
    if (!song) return;

    // Check if song is already in setlist
    if (setlist.songSlugs.includes(song.slug)) {
      alert('This song is already in the setlist!');
      return;
    }

    const updatedSetlist = {
      ...setlist,
      songSlugs: [...setlist.songSlugs, song.slug],
      updated_at: new Date().toISOString(),
    };

    await saveSetlist(updatedSetlist);
    alert(`Added "${song.song_name}" to "${setlist.name}"`);
    onClose();
  };

  const handleCreateAndAdd = async () => {
    if (!song || !newSetlistName.trim()) return;

    const newSetlist: SetlistData = {
      id: crypto.randomUUID(),
      name: newSetlistName.trim(),
      songSlugs: [song.slug],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveSetlist(newSetlist);
    alert(`Created "${newSetlist.name}" with "${song.song_name}"`);
    onClose();
  };

  if (!isOpen || !song) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-primary-alt border-2 border-gray-dark rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-dark flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Add to Setlist</h2>
            <p className="text-sm text-gray-light truncate">{song.song_name}</p>
          </div>
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
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-light text-sm">Loading setlists...</p>
            </div>
          ) : (
            <>
              {/* Existing setlists */}
              {setlists.length > 0 && (
                <div className="space-y-2 mb-4">
                  {setlists.map((setlist) => {
                    const isInSetlist = setlist.songSlugs.includes(song.slug);
                    return (
                      <button
                        key={setlist.id}
                        onClick={() => handleAddToSetlist(setlist)}
                        disabled={isInSetlist}
                        className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
                          isInSetlist
                            ? 'bg-gray-dark/50 cursor-not-allowed opacity-50'
                            : 'bg-primary hover:bg-gray-dark'
                        }`}
                      >
                        <div>
                          <p className="text-white font-medium">
                            {setlist.name}
                          </p>
                          <p className="text-xs text-gray-light">
                            {setlist.songSlugs.length} song
                            {setlist.songSlugs.length !== 1 ? 's' : ''}
                            {isInSetlist && ' • Already added'}
                          </p>
                        </div>
                        {!isInSetlist && (
                          <svg
                            className="w-5 h-5 text-gray-light"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Create new setlist */}
              {creating ? (
                <div className="bg-primary rounded-lg p-4">
                  <input
                    type="text"
                    value={newSetlistName}
                    onChange={(e) => setNewSetlistName(e.target.value)}
                    placeholder="New setlist name..."
                    className="w-full bg-primary-alt border-2 border-gray-dark focus:border-secondary rounded-lg px-4 py-2 text-white placeholder-gray-light outline-none transition-colors mb-3"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateAndAdd();
                      if (e.key === 'Escape') setCreating(false);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCreating(false)}
                      className="flex-1 bg-gray-dark hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateAndAdd}
                      disabled={!newSetlistName.trim()}
                      className="flex-1 bg-secondary hover:bg-secondary-bold disabled:bg-gray-dark text-primary disabled:text-gray-light py-2 rounded-lg text-sm font-semibold"
                    >
                      Create & Add
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full p-3 rounded-lg border-2 border-dashed border-gray-dark hover:border-secondary text-gray-light hover:text-white transition-colors flex items-center justify-center gap-2"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create New Setlist
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
