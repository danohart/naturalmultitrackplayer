// src/store/useDownloadStore.ts

import { create } from 'zustand';
import { isSongCached } from '@/lib/storage/db';

type CacheStatus = 'cached' | 'downloading' | 'not-cached' | 'error';

interface DownloadState {
  // songId -> download progress (0-100)
  progress: Record<number, number>;

  // songId -> is currently downloading
  activeDownloads: Set<number>;

  // songId -> cache status
  cacheStatus: Record<number, CacheStatus>;

  // Actions
  setProgress: (songId: number, percent: number) => void;
  setCacheStatus: (songId: number, status: CacheStatus) => void;
  addActiveDownload: (songId: number) => void;
  removeActiveDownload: (songId: number) => void;
  checkCacheStatus: (songId: number) => Promise<void>;
  checkMultipleCacheStatus: (songIds: number[]) => Promise<void>;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  progress: {},
  activeDownloads: new Set<number>(),
  cacheStatus: {},

  setProgress: (songId, percent) =>
    set((state) => ({
      progress: {
        ...state.progress,
        [songId]: percent,
      },
    })),

  setCacheStatus: (songId, status) =>
    set((state) => ({
      cacheStatus: {
        ...state.cacheStatus,
        [songId]: status,
      },
    })),

  addActiveDownload: (songId) =>
    set((state) => ({
      activeDownloads: new Set([...state.activeDownloads, songId]),
    })),

  removeActiveDownload: (songId) =>
    set((state) => {
      const newSet = new Set(state.activeDownloads);
      newSet.delete(songId);
      return { activeDownloads: newSet };
    }),

  checkCacheStatus: async (songId) => {
    const cached = await isSongCached(songId);
    get().setCacheStatus(songId, cached ? 'cached' : 'not-cached');
  },

  checkMultipleCacheStatus: async (songIds) => {
    // Check cache status for multiple songs in parallel
    await Promise.all(songIds.map((id) => get().checkCacheStatus(id)));
  },
}));
