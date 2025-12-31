// src/store/useStore.ts

import { create } from 'zustand';
import { Song, Setlist, TrackState } from '@/lib/types';

interface AppState {
  // Songs
  songs: Song[];
  setSongs: (songs: Song[]) => void;
  
  // Current setlist
  currentSetlist: Setlist | null;
  setCurrentSetlist: (setlist: Setlist | null) => void;
  
  // Currently playing song
  currentSong: Song | null;
  setCurrentSong: (song: Song | null) => void;
  
  // Audio state
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  
  currentTime: number;
  setCurrentTime: (time: number) => void;
  
  duration: number;
  setDuration: (duration: number) => void;
  
  // Track states (volume, mute, solo per track)
  trackStates: Record<string, TrackState>;
  setTrackVolume: (trackFilename: string, volume: number) => void;
  setTrackMuted: (trackFilename: string, muted: boolean) => void;
  setTrackSolo: (trackFilename: string, solo: boolean) => void;
  resetTrackStates: () => void;
  
  // Download progress
  downloadProgress: Record<number, number>; // songId -> progress (0-100)
  setDownloadProgress: (songId: number, progress: number) => void;
  
  // UI state
  showingSetlistManager: boolean;
  setShowingSetlistManager: (showing: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Songs
  songs: [],
  setSongs: (songs) => set({ songs }),
  
  // Current setlist
  currentSetlist: null,
  setCurrentSetlist: (setlist) => set({ currentSetlist: setlist }),
  
  // Currently playing song
  currentSong: null,
  setCurrentSong: (song) => set({ currentSong: song }),
  
  // Audio state
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  currentTime: 0,
  setCurrentTime: (time) => set({ currentTime: time }),
  
  duration: 0,
  setDuration: (duration) => set({ duration: duration }),
  
  // Track states
  trackStates: {},
  setTrackVolume: (trackFilename, volume) =>
    set((state) => ({
      trackStates: {
        ...state.trackStates,
        [trackFilename]: {
          ...state.trackStates[trackFilename],
          volume,
        },
      },
    })),
  
  setTrackMuted: (trackFilename, muted) =>
    set((state) => ({
      trackStates: {
        ...state.trackStates,
        [trackFilename]: {
          ...state.trackStates[trackFilename],
          muted,
        },
      },
    })),
  
  setTrackSolo: (trackFilename, solo) =>
    set((state) => ({
      trackStates: {
        ...state.trackStates,
        [trackFilename]: {
          ...state.trackStates[trackFilename],
          solo,
        },
      },
    })),
  
  resetTrackStates: () => set({ trackStates: {} }),
  
  // Download progress
  downloadProgress: {},
  setDownloadProgress: (songId, progress) =>
    set((state) => ({
      downloadProgress: {
        ...state.downloadProgress,
        [songId]: progress,
      },
    })),
  
  // UI state
  showingSetlistManager: false,
  setShowingSetlistManager: (showing) => set({ showingSetlistManager: showing }),
}));
