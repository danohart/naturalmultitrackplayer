// src/app/library/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAllSongs } from '@/lib/api/wordpress';
import { isSongCached, getStorageUsed } from '@/lib/storage/db';
import { Song } from '@/lib/types';
import SongCard from '@/components/library/SongCard';
import SearchBar from '@/components/library/SearchBar';

const SONGS_PER_PAGE = 24;

function LibraryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read state from URL
  const searchTerm = searchParams.get('q') || '';
  const filterKey = searchParams.get('key') || 'all';
  const filterBpm = searchParams.get('bpm') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [songs, setSongs] = useState<Song[]>([]);
  const [cachedSongIds, setCachedSongIds] = useState<Set<number>>(new Set());
  const [storageUsed, setStorageUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  // Update URL with new params
  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all' || (key === 'page' && value === '1')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    router.push(queryString ? `/library?${queryString}` : '/library', { scroll: false });
  }, [searchParams, router]);

  // Filter handlers that reset page
  const handleSearchChange = useCallback((value: string) => {
    updateUrl({ q: value, page: '1' });
  }, [updateUrl]);

  const handleKeyChange = useCallback((value: string) => {
    updateUrl({ key: value, page: '1' });
  }, [updateUrl]);

  const handleBpmChange = useCallback((value: string) => {
    updateUrl({ bpm: value, page: '1' });
  }, [updateUrl]);

  const handlePageChange = useCallback((page: number) => {
    updateUrl({ page: page.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [updateUrl]);

  const handleClearFilters = useCallback(() => {
    router.push('/library', { scroll: false });
  }, [router]);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      setLoading(true);

      // Fetch songs from WordPress
      const allSongs = await fetchAllSongs();
      setSongs(allSongs);

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

  // Filter songs based on URL params
  const filteredSongs = useMemo(() => {
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

    return filtered;
  }, [songs, searchTerm, filterKey, filterBpm]);

  // Pagination
  const totalPages = Math.ceil(filteredSongs.length / SONGS_PER_PAGE);
  const validPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const paginatedSongs = useMemo(() => {
    const start = (validPage - 1) * SONGS_PER_PAGE;
    return filteredSongs.slice(start, start + SONGS_PER_PAGE);
  }, [filteredSongs, validPage]);

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
              <h1 className="text-3xl font-bold text-primary">Song Library</h1>
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
            onSearchChange={handleSearchChange}
            filterKey={filterKey}
            onKeyChange={handleKeyChange}
            filterBpm={filterBpm}
            onBpmChange={handleBpmChange}
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
              onClick={handleClearFilters}
              className="mt-4 text-primary hover:text-primary-bold underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Results info */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-light text-sm">
                Showing {(validPage - 1) * SONGS_PER_PAGE + 1}-{Math.min(validPage * SONGS_PER_PAGE, filteredSongs.length)} of {filteredSongs.length} songs
              </p>
              {totalPages > 1 && (
                <p className="text-gray-light text-sm">
                  Page {validPage} of {totalPages}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedSongs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isCached={cachedSongIds.has(song.id)}
                  onClick={() => handleSongClick(song)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={validPage === 1}
                  className="px-3 py-2 rounded-lg bg-primary-alt border border-gray-dark text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-dark transition-colors"
                  aria-label="First page"
                >
                  &laquo;
                </button>
                <button
                  onClick={() => handlePageChange(validPage - 1)}
                  disabled={validPage === 1}
                  className="px-3 py-2 rounded-lg bg-primary-alt border border-gray-dark text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-dark transition-colors"
                  aria-label="Previous page"
                >
                  &lsaquo;
                </button>

                {/* Page numbers */}
                {(() => {
                  const pages: (number | string)[] = [];
                  const showPages = 5;
                  let start = Math.max(1, validPage - Math.floor(showPages / 2));
                  const end = Math.min(totalPages, start + showPages - 1);
                  start = Math.max(1, end - showPages + 1);

                  if (start > 1) {
                    pages.push(1);
                    if (start > 2) pages.push('...');
                  }

                  for (let i = start; i <= end; i++) {
                    pages.push(i);
                  }

                  if (end < totalPages) {
                    if (end < totalPages - 1) pages.push('...');
                    pages.push(totalPages);
                  }

                  return pages.map((page, idx) =>
                    typeof page === 'string' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-light">
                        {page}
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          page === validPage
                            ? 'bg-secondary text-primary border-secondary font-semibold'
                            : 'bg-primary-alt border-gray-dark text-white hover:bg-gray-dark'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  );
                })()}

                <button
                  onClick={() => handlePageChange(validPage + 1)}
                  disabled={validPage === totalPages}
                  className="px-3 py-2 rounded-lg bg-primary-alt border border-gray-dark text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-dark transition-colors"
                  aria-label="Next page"
                >
                  &rsaquo;
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={validPage === totalPages}
                  className="px-3 py-2 rounded-lg bg-primary-alt border border-gray-dark text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-dark transition-colors"
                  aria-label="Last page"
                >
                  &raquo;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-primary flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading song library...</p>
          </div>
        </div>
      }
    >
      <LibraryPageContent />
    </Suspense>
  );
}
