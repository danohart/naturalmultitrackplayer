// src/lib/api/wordpress.ts

import { Song } from '../types';

const WP_BASE_URL = process.env.NEXT_PUBLIC_WP_API_URL || 'http://naturalmusicstore.test';
const WP_API_ENDPOINT = `${WP_BASE_URL}/wp-json/wp/v2/rehearsal_materials`;

// Cache key for localStorage
const CACHE_KEY = 'natural_mixer_songs_cache';
const CACHE_TIMESTAMP_KEY = 'natural_mixer_songs_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached songs from localStorage
 */
function getCachedSongs(): Song[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (!cached || !timestamp) return null;

    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_DURATION) {
      // Cache expired
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Save songs to localStorage cache
 */
function setCachedSongs(songs: Song[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(songs));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

/**
 * Fetch all songs from WordPress (with offline fallback)
 */
export async function fetchAllSongs(): Promise<Song[]> {
  try {
    const response = await fetch(`${WP_API_ENDPOINT}?per_page=100`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    const songs = data
      .filter((item: any) => {
        // Only include songs that have valid track data
        return item.track_data && 
               item.track_data.tracks && 
               Array.isArray(item.track_data.tracks) &&
               item.track_data.tracks.length > 0;
      })
      .map((item: any) => ({
        id: item.id,
        slug: item.slug,
        title: item.title.rendered,
        song_name: item.track_data.song_name,
        bpm: item.track_data.bpm,
        key: item.track_data.key,
        time_signature: item.track_data.time_signature,
        tracks: item.track_data.tracks,
        pdfs: item.track_data.pdfs,
        total_size_mb: item.track_data.total_size_mb || 0,
      }));

    // Cache the results
    setCachedSongs(songs);
    
    return songs;
  } catch (error) {
    console.error('Error fetching songs, trying cache:', error);
    
    // Try to return cached data
    const cached = getCachedSongs();
    if (cached) {
      console.log('Using cached song data');
      return cached;
    }
    
    throw error;
  }
}

/**
 * Fetch a single song by slug (with offline fallback)
 */
export async function fetchSongBySlug(slug: string): Promise<Song | null> {
  try {
    const response = await fetch(`${WP_API_ENDPOINT}?slug=${slug}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.length === 0 || !data[0].track_data) {
      return null;
    }
    
    const item = data[0];
    
    return {
      id: item.id,
      slug: item.slug,
      title: item.title.rendered,
      song_name: item.track_data.song_name,
      bpm: item.track_data.bpm,
      key: item.track_data.key,
      time_signature: item.track_data.time_signature,
      tracks: item.track_data.tracks,
      pdfs: item.track_data.pdfs,
      total_size_mb: item.track_data.total_size_mb,
    };
  } catch (error) {
    console.error(`Error fetching song ${slug}, trying cache:`, error);
    
    // Try to find in cached songs
    const cached = getCachedSongs();
    if (cached) {
      const song = cached.find((s) => s.slug === slug);
      if (song) {
        console.log('Using cached song data for', slug);
        return song;
      }
    }
    
    return null;
  }
}

/**
 * Fetch songs by IDs
 */
export async function fetchSongsByIds(ids: number[]): Promise<Song[]> {
  try {
    const idsParam = ids.join(',');
    const response = await fetch(`${WP_API_ENDPOINT}?include=${idsParam}&per_page=100`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data
      .filter((item: any) => item.track_data)
      .map((item: any) => ({
        id: item.id,
        slug: item.slug,
        title: item.title.rendered,
        song_name: item.track_data.song_name,
        bpm: item.track_data.bpm,
        key: item.track_data.key,
        time_signature: item.track_data.time_signature,
        tracks: item.track_data.tracks,
        pdfs: item.track_data.pdfs,
        total_size_mb: item.track_data.total_size_mb,
      }));
  } catch (error) {
    console.error('Error fetching songs by IDs:', error);
    throw error;
  }
}

/**
 * Fetch songs by slugs and return both found songs and missing slugs
 */
export async function fetchSongsBySlugs(
  slugs: string[]
): Promise<{ songs: Song[]; missingSlugs: string[] }> {
  // Get all songs (uses cache when available)
  const allSongs = await fetchAllSongs();
  const songMap = new Map(allSongs.map((s) => [s.slug, s]));

  const songs: Song[] = [];
  const missingSlugs: string[] = [];

  // Preserve order from input slugs
  for (const slug of slugs) {
    const song = songMap.get(slug);
    if (song) {
      songs.push(song);
    } else {
      missingSlugs.push(slug);
    }
  }

  return { songs, missingSlugs };
}
