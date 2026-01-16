// src/lib/storage/db.ts

import Dexie, { Table } from 'dexie';
import { CachedTrack, SetlistData } from '../types';

export interface CachedSong {
  id: number;
  slug: string;
  song_name: string;
  metadata: string; // JSON stringified song data
  cached_at: string;
  total_size_mb: number;
}

export class MixerDatabase extends Dexie {
  cachedTracks!: Table<CachedTrack, number>;
  cachedSongs!: Table<CachedSong, number>;
  setlists!: Table<SetlistData, string>;

  constructor() {
    super('NaturalMixerDB');
    
    this.version(1).stores({
      cachedTracks: '++id, [songId+trackFilename], songId',
      cachedSongs: 'id, slug, cached_at',
      setlists: 'id, name, updated_at',
    });
  }
}

export const db = new MixerDatabase();

/**
 * Check if a song is fully cached
 */
export async function isSongCached(songId: number): Promise<boolean> {
  const cached = await db.cachedSongs.get(songId);
  return !!cached;
}

/**
 * Get cached song metadata
 */
export async function getCachedSong(songId: number): Promise<CachedSong | undefined> {
  return await db.cachedSongs.get(songId);
}

/**
 * Cache a complete song with all tracks
 */
export async function cacheSong(
  songId: number,
  slug: string,
  songName: string,
  metadata: any,
  tracks: Array<{ filename: string; url: string; size_mb: number }>
): Promise<void> {
  // Download and cache each track
  for (const track of tracks) {
    const response = await fetch(track.url);
    if (!response.ok) {
      throw new Error(`Failed to download ${track.filename}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Store track in IndexedDB
    await db.cachedTracks.put({
      songId,
      trackFilename: track.filename,
      audioData: arrayBuffer,
      cachedAt: new Date().toISOString(),
    });
  }
  
  // Store song metadata
  await db.cachedSongs.put({
    id: songId,
    slug,
    song_name: songName,
    metadata: JSON.stringify(metadata),
    cached_at: new Date().toISOString(),
    total_size_mb: tracks.reduce((sum, t) => sum + t.size_mb, 0),
  });
}

/**
 * Get a cached track's audio data
 */
export async function getCachedTrack(
  songId: number,
  trackFilename: string
): Promise<ArrayBuffer | null> {
  const track = await db.cachedTracks
    .where('[songId+trackFilename]')
    .equals([songId, trackFilename])
    .first();
  
  return track ? track.audioData : null;
}

/**
 * Get all tracks for a cached song
 */
export async function getCachedSongTracks(songId: number): Promise<CachedTrack[]> {
  return await db.cachedTracks.where('songId').equals(songId).toArray();
}

/**
 * Delete a cached song and all its tracks
 */
export async function deleteCachedSong(songId: number): Promise<void> {
  await db.cachedTracks.where('songId').equals(songId).delete();
  await db.cachedSongs.delete(songId);
}

/**
 * Get total storage used (in MB)
 */
export async function getStorageUsed(): Promise<number> {
  const songs = await db.cachedSongs.toArray();
  return songs.reduce((sum, song) => sum + song.total_size_mb, 0);
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  await db.cachedTracks.clear();
  await db.cachedSongs.clear();
}

/**
 * Save a setlist
 */
export async function saveSetlist(setlist: SetlistData): Promise<void> {
  await db.setlists.put(setlist);
}

/**
 * Get all setlists
 */
export async function getSetlists(): Promise<SetlistData[]> {
  return await db.setlists.toArray();
}

/**
 * Get a single setlist by ID
 */
export async function getSetlist(id: string): Promise<SetlistData | undefined> {
  return await db.setlists.get(id);
}

/**
 * Delete a setlist
 */
export async function deleteSetlist(id: string): Promise<void> {
  await db.setlists.delete(id);
}
