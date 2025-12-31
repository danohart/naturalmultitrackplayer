// src/app/library/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAllSongs } from '@/lib/api/wordpress';
import { isSongCached, getStorageUsed } from '@/lib/storage/db';
import { Song } from '@/lib/types';
import SongCard from '@/components/library/SongCard';
import SearchBar from '@/components/library/SearchBar';

export default function LibraryPage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [cachedSongIds, setCachedSongIds] = useState<Set<number>>(new Set());
  const [storageUsed, setStorageUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKey, setFilterKey] = useState<string>('all');
  const [filterBpm, setFilterBpm] = useState<string>('all');

  useEffect(() => {
    loadLibrary();
  }, []);

  useEffect(() => {
    filterSongs();
  }, [searchTerm, filterKey, filterBpm, songs]);

  const loadLibrary = async () => {
    try {
      setLoading(true);

      // Fetch songs from WordPress
      const allSongs = await fetchAllSongs();
      setSongs(allSongs);
      setFilteredSongs(allSongs);

      // Check which songs are cached
      const cached = new Set<number>();
      for (const song of allSongs) {
        const isCached = await isSongCached(song.id);
        if (isCached) {
          cached.add(song.id);
        }
      }
      setCachedSongIds(cached);

      // Get storage usage
      const storage = await getStorageUsed();
      setStorageUsed(storage);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSongs = () => {
    let filtered = [...songs];

    // Search by name
    if (searchTerm) {
      filtered = filtered.filter((song) =>
        song.song_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by key
    if (filterKey !== 'all') {
      filtered = filtered.filter((song) => song.key === filterKey);
    }

    // Filter by BPM range
    if (filterBpm !== 'all') {
      filtered = filtered.filter((song) => {
        if (!song.bpm) return false;
        if (filterBpm === 'slow') return song.bpm < 100;
        if (filterBpm === 'medium') return song.bpm >= 100 && song.bpm < 140;
        if (filterBpm === 'fast') return song.bpm >= 140;
        return true;
      });
    }

    setFilteredSongs(filtered);
  };

  const handleSongClick = (song: Song) => {
    router.push(`/mixer?song=${song.slug}`);
  };

  // Get unique keys for filter
  const uniqueKeys = Array.from(
  new Set(songs.map((s) => s.key).filter((key): key is string => Boolean(key)))
).sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading song library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-white">
      {/* Header */}
      <div className="bg-primary-alt border-b border-gray-dark">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-secondary">Song Library</h1>
              <p className="text-gray-light mt-1">
                {songs.length} songs • {cachedSongIds.size} downloaded • {storageUsed.toFixed(1)}MB used
              </p>
            </div>
            <button
              onClick={() => router.push('/setlist')}
              className="bg-secondary hover:bg-secondary-bold text-primary px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              📋 My Setlists
            </button>
          </div>

          {/* Search and Filters */}
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterKey={filterKey}
            onKeyChange={setFilterKey}
            filterBpm={filterBpm}
            onBpmChange={setFilterBpm}
            uniqueKeys={uniqueKeys}
          />
        </div>
      </div>

      {/* Song Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredSongs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-light text-lg">No songs found matching your filters.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterKey('all');
                setFilterBpm('all');
              }}
              className="mt-4 text-secondary hover:text-secondary-bold underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                isCached={cachedSongIds.has(song.id)}
                onClick={() => handleSongClick(song)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
