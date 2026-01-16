// src/app/setlist/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSetlist, saveSetlist } from '@/lib/storage/db';
import { fetchSongsBySlugs } from '@/lib/api/wordpress';
import { generateShareUrl } from '@/lib/setlist/sharing';
import { SetlistData, Song } from '@/lib/types';
import SongPickerModal from '@/components/setlist/SongPickerModal';
import SetlistSongRow from '@/components/setlist/SetlistSongRow';

export default function SetlistEditorPage() {
  const params = useParams();
  const router = useRouter();
  const setlistId = params.id as string;

  const [setlist, setSetlist] = useState<SetlistData | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadSetlist();
  }, [setlistId]);

  const loadSetlist = async () => {
    try {
      setLoading(true);
      const data = await getSetlist(setlistId);
      if (!data) {
        router.push('/setlist');
        return;
      }
      setSetlist(data);
      setTempName(data.name);

      // Load song details
      if (data.songSlugs.length > 0) {
        const result = await fetchSongsBySlugs(data.songSlugs);
        setSongs(result.songs);
      }
    } catch (error) {
      console.error('Failed to load setlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(
    async (updatedSetlist: SetlistData) => {
      const newSetlist = {
        ...updatedSetlist,
        updated_at: new Date().toISOString(),
      };
      await saveSetlist(newSetlist);
      setSetlist(newSetlist);
    },
    []
  );

  const handleNameSave = async () => {
    if (setlist && tempName.trim()) {
      await handleSave({ ...setlist, name: tempName.trim() });
    }
    setEditingName(false);
  };

  const handleAddSongs = async (slugs: string[]) => {
    if (!setlist) return;

    const newSlugs = [...setlist.songSlugs, ...slugs];
    await handleSave({ ...setlist, songSlugs: newSlugs });

    // Refresh songs
    const result = await fetchSongsBySlugs(newSlugs);
    setSongs(result.songs);
    setShowPicker(false);
  };

  const handleRemoveSong = async (index: number) => {
    if (!setlist) return;

    const newSlugs = [...setlist.songSlugs];
    newSlugs.splice(index, 1);
    await handleSave({ ...setlist, songSlugs: newSlugs });

    const newSongs = [...songs];
    newSongs.splice(index, 1);
    setSongs(newSongs);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder songs visually
    const newSongs = [...songs];
    const [draggedSong] = newSongs.splice(draggedIndex, 1);
    newSongs.splice(index, 0, draggedSong);
    setSongs(newSongs);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (!setlist || draggedIndex === null) return;

    // Save new order
    const newSlugs = songs.map((s) => s.slug);
    await handleSave({ ...setlist, songSlugs: newSlugs });
    setDraggedIndex(null);
  };

  const handleShare = async () => {
    if (!setlist) return;
    const url = generateShareUrl(setlist.name, setlist.songSlugs);
    try {
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard!');
    } catch {
      prompt('Copy this link to share:', url);
    }
  };

  const handlePlay = () => {
    if (!setlist || setlist.songSlugs.length === 0) return;
    router.push(
      `/mixer?song=${setlist.songSlugs[0]}&setlist=${setlist.id}&index=0`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading setlist...</p>
        </div>
      </div>
    );
  }

  if (!setlist) {
    return null;
  }

  return (
    <div className="min-h-screen bg-primary text-white">
      {/* Header */}
      <div className="bg-primary-alt border-b border-gray-dark">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Name editing */}
          <div className="mb-4">
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') {
                      setTempName(setlist.name);
                      setEditingName(false);
                    }
                  }}
                  className="flex-1 bg-primary border-2 border-secondary rounded-lg px-4 py-2 text-2xl font-bold text-white outline-none"
                  autoFocus
                />
                <button
                  onClick={handleNameSave}
                  className="bg-secondary hover:bg-secondary-bold text-primary px-4 py-2 rounded-lg font-semibold"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-3xl font-bold text-primary hover:text-secondary transition-colors flex items-center gap-2"
              >
                {setlist.name}
                <svg
                  className="w-5 h-5 opacity-50"
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
            )}
            <p className="text-gray-light mt-1">
              {songs.length} song{songs.length !== 1 ? 's' : ''} • Drag to
              reorder
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowPicker(true)}
              className="bg-secondary hover:bg-secondary-bold text-primary px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              + Add Songs
            </button>
            <button
              onClick={handleShare}
              disabled={songs.length === 0}
              className="bg-gray-dark hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
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
              Share
            </button>
            <button
              onClick={handlePlay}
              disabled={songs.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-colors ml-auto"
            >
              Practice
            </button>
          </div>
        </div>
      </div>

      {/* Song List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {songs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-light text-lg mb-4">
              This setlist is empty. Add some songs to get started!
            </p>
            <button
              onClick={() => setShowPicker(true)}
              className="bg-secondary hover:bg-secondary-bold text-primary px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Add Songs
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((song, index) => (
              <SetlistSongRow
                key={`${song.slug}-${index}`}
                song={song}
                index={index}
                onRemove={() => handleRemoveSong(index)}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                isDragging={draggedIndex === index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Song Picker Modal */}
      <SongPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onAddSongs={handleAddSongs}
        existingSlugs={setlist.songSlugs}
      />
    </div>
  );
}
