// src/components/mixer/MixerContent.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchSongBySlug, fetchSongsBySlugs } from '@/lib/api/wordpress';
import { isSongCached, getSetlist, db } from '@/lib/storage/db';
import { getAudioEngine } from '@/lib/audio/engine';
import { Song, HydratedSetlist } from '@/lib/types';
import MixerControls from '@/components/mixer/MixerControls';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import SetlistPanel from '@/components/mixer/SetlistPanel';

type LoadingState = 'idle' | 'checking-cache' | 'downloading' | 'loading-audio' | 'ready' | 'error';

export default function MixerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const songSlug = searchParams.get('song') || 'what-hes-done';
  const setlistId = searchParams.get('setlist');
  const setlistIndexParam = searchParams.get('index');

  const [song, setSong] = useState<Song | null>(null);
  const [currentSetlist, setCurrentSetlist] = useState<HydratedSetlist | null>(null);
  const [currentSetlistIndex, setCurrentSetlistIndex] = useState(0);
  const [loadingState, setLoadingState] = useState<LoadingState>('checking-cache');
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [trackStates, setTrackStates] = useState<Record<string, { volume: number; muted: boolean; solo: boolean }>>({});

  useEffect(() => {
    initializeSong();
    if (setlistId) {
      loadSetlist();
    }
    if (setlistIndexParam !== null) {
      setCurrentSetlistIndex(parseInt(setlistIndexParam, 10) || 0);
    }
  }, [songSlug, setlistId, setlistIndexParam]);

  const loadSetlist = async () => {
    if (!setlistId) return;
    try {
      const setlistData = await getSetlist(setlistId);
      if (setlistData && setlistData.songSlugs.length > 0) {
        const { songs, missingSlugs } = await fetchSongsBySlugs(setlistData.songSlugs);
        const hydrated: HydratedSetlist = {
          id: setlistData.id,
          name: setlistData.name,
          songs,
          missingSlugs,
          created_at: setlistData.created_at,
          updated_at: setlistData.updated_at,
        };
        setCurrentSetlist(hydrated);

        // Preload all setlist songs in the background
        preloadSetlistSongs(songs);
      }
    } catch (err) {
      console.error('Failed to load setlist:', err);
    }
  };

  // Preload all songs in the setlist for instant switching
  const preloadSetlistSongs = async (songs: Song[]) => {
    const engine = getAudioEngine();
    for (const s of songs) {
      // Skip current song (it's already loaded)
      if (s.slug === songSlug) continue;

      // Check if song is cached in IndexedDB
      const cached = await isSongCached(s.id);
      if (cached) {
        // Preload in background (don't await - fire and forget)
        engine.preloadSong(s.id, s.tracks).catch((err) => {
          console.warn(`Failed to preload ${s.song_name}:`, err);
        });
      }
    }
  };

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const engine = getAudioEngine();
      setCurrentTime(engine.getCurrentTime());
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const initializeSong = async () => {
    try {
      setLoadingState('checking-cache');
      setLoadingMessage('Loading song metadata...');
      setLoadingProgress(10);

      const songData = await fetchSongBySlug(songSlug);
      if (!songData) {
        throw new Error('Song not found');
      }
      setSong(songData);
      setLoadingProgress(20);

      const initialStates: Record<string, { volume: number; muted: boolean; solo: boolean }> = {};
      songData.tracks.forEach((track) => {
        initialStates[track.converted_filename] = {
          volume: 1,
          muted: false,
          solo: false,
        };
      });
      setTrackStates(initialStates);

      setLoadingMessage('Checking local cache...');
      setLoadingProgress(30);
      const cached = await isSongCached(songData.id);

      if (!cached) {
        await downloadSong(songData);
      } else {
        setLoadingProgress(60);
      }

      await loadAudioEngine(songData);

      setLoadingState('ready');
      setLoadingMessage('Ready to play!');
      setLoadingProgress(100);
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize');
      setLoadingState('error');
    }
  };

  const downloadSong = async (songData: Song) => {
    setLoadingState('downloading');
    setLoadingMessage(`Downloading ${songData.song_name}...`);
    setLoadingProgress(35);

    const tracks = songData.tracks.map((t) => ({
      filename: t.converted_filename,
      url: t.url,
      size_mb: t.size_mb,
    }));

    const totalSize = tracks.reduce((sum, t) => sum + t.size_mb, 0);

    // Download all tracks in parallel
    setLoadingMessage(`Downloading ${tracks.length} tracks...`);

    const downloadPromises = tracks.map(async (track) => {
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error(`Failed to download ${track.filename}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      await db.cachedTracks.put({
        songId: songData.id,
        trackFilename: track.filename,
        audioData: arrayBuffer,
        cachedAt: new Date().toISOString(),
      });

      return track.size_mb;
    });

    await Promise.all(downloadPromises);

    // Save song metadata
    await db.cachedSongs.put({
      id: songData.id,
      slug: songData.slug,
      song_name: songData.song_name,
      metadata: JSON.stringify(songData),
      cached_at: new Date().toISOString(),
      total_size_mb: totalSize,
    });

    setLoadingProgress(60);
  };

  const loadAudioEngine = async (songData: Song) => {
    setLoadingState('loading-audio');
    setLoadingMessage('Decoding audio tracks...');
    setLoadingProgress(70);

    const engine = getAudioEngine();
    await engine.loadSong(songData.id, songData.tracks);

    const songDuration = engine.getDuration();
    setDuration(songDuration);

    setLoadingProgress(100);
  };

  const handlePlay = useCallback(() => {
    const engine = getAudioEngine();
    engine.play();
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    const engine = getAudioEngine();
    engine.pause();
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    const engine = getAudioEngine();
    engine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleBackToLibrary = useCallback(() => {
    const engine = getAudioEngine();
    engine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    router.push('/library');
  }, [router]);

  const handleSeek = useCallback((time: number) => {
    const engine = getAudioEngine();
    engine.seek(time);
    setCurrentTime(time);
  }, []);

  const handleVolumeChange = useCallback((trackFilename: string, volume: number) => {
    const engine = getAudioEngine();
    engine.setTrackVolume(trackFilename, volume);

    setTrackStates((prev) => ({
      ...prev,
      [trackFilename]: { ...prev[trackFilename], volume },
    }));
  }, []);

  const handleMuteToggle = useCallback((trackFilename: string) => {
    const currentState = trackStates[trackFilename];
    const currentMuted = currentState?.muted || false;
    const newMuted = !currentMuted;

    const engine = getAudioEngine();
    const newStates = { ...trackStates };

    // If turning on mute, turn off solo for this track
    if (newMuted && currentState?.solo) {
      newStates[trackFilename] = {
        ...currentState,
        muted: true,
        solo: false,
      };
    } else {
      newStates[trackFilename] = {
        ...currentState,
        muted: newMuted,
      };
    }

    // Recalculate audio muting based on solo/mute states
    const soloedTracks = Object.entries(newStates).filter(([, s]) => s.solo);
    const hasSoloedTracks = soloedTracks.length > 0;

    Object.entries(newStates).forEach(([filename, state]) => {
      // Track is audio-muted if: manually muted OR (has soloed tracks AND this isn't one)
      const shouldMute = state.muted || (hasSoloedTracks && !state.solo);
      engine.setTrackMuted(filename, shouldMute);
    });

    setTrackStates(newStates);
  }, [trackStates]);

  const handleSoloToggle = useCallback((trackFilename: string) => {
    const currentState = trackStates[trackFilename];
    const currentSolo = currentState?.solo || false;
    const newSolo = !currentSolo;

    const engine = getAudioEngine();
    const newStates = { ...trackStates };

    // If turning on solo, turn off mute for this track
    if (newSolo && currentState?.muted) {
      newStates[trackFilename] = {
        ...currentState,
        solo: true,
        muted: false,
      };
    } else {
      newStates[trackFilename] = {
        ...currentState,
        solo: newSolo,
      };
    }

    // Recalculate audio muting based on solo/mute states
    const soloedTracks = Object.entries(newStates).filter(([, s]) => s.solo);
    const hasSoloedTracks = soloedTracks.length > 0;

    Object.entries(newStates).forEach(([filename, state]) => {
      // Track is audio-muted if: manually muted OR (has soloed tracks AND this isn't one)
      const shouldMute = state.muted || (hasSoloedTracks && !state.solo);
      engine.setTrackMuted(filename, shouldMute);
    });

    setTrackStates(newStates);
  }, [trackStates]);

  const handleReset = useCallback(() => {
    const engine = getAudioEngine();
    const newStates = { ...trackStates };

    Object.keys(newStates).forEach((filename) => {
      engine.setTrackVolume(filename, 1);
      engine.setTrackMuted(filename, false);
      newStates[filename] = {
        volume: 1,
        muted: false,
        solo: false,
      };
    });

    setTrackStates(newStates);
  }, [trackStates]);

  const handleSetlistSongSelect = useCallback((index: number) => {
    if (!currentSetlist || index < 0 || index >= currentSetlist.songs.length) return;

    // Stop current playback
    const engine = getAudioEngine();
    engine.stop();
    setIsPlaying(false);
    setCurrentTime(0);

    // Navigate to the new song
    const newSong = currentSetlist.songs[index];
    router.push(`/mixer?song=${newSong.slug}&setlist=${currentSetlist.id}&index=${index}`);
  }, [currentSetlist, router]);

  if (loadingState !== 'ready') {
    return (
      <LoadingOverlay
        state={loadingState}
        message={loadingMessage}
        progress={loadingProgress}
        error={error}
      />
    );
  }

  if (!song) {
    return <div>Error: Song not found</div>;
  }

  return (
    <div className="h-screen bg-gray-lightest text-white flex overflow-hidden">
      {/* Left Panel - Track Mixer */}
      <div className="flex-1 flex flex-col min-w-0">
        <MixerControls
          tracks={song.tracks}
          trackStates={trackStates}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
          onSoloToggle={handleSoloToggle}
          disabled={false}
        />
      </div>

      {/* Right Panel - Song Info, Transport, Future Setlist */}
      <div className="w-72 bg-primary-alt border-l border-gray-dark flex flex-col">
        {/* Song Info */}
        <div className="p-4 border-b border-gray-dark">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-lightest leading-tight">{song.song_name}</h1>
              <div className="text-sm text-gray-light mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {song.bpm && <span>{song.bpm} BPM</span>}
                {song.key && <span>Key: {song.key}</span>}
                {song.time_signature && <span>{song.time_signature}</span>}
              </div>
            </div>
            <button
              onClick={handleBackToLibrary}
              className="flex-shrink-0 p-2 rounded-lg bg-gray-dark hover:bg-gray-700 transition-colors"
              aria-label="Back to library"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Transport Controls */}
        <div className="p-4 border-b border-gray-dark">
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-10 bg-gray-dark rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-light mt-1 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Play/Pause Button - Wide */}
          {isPlaying ? (
            <button
              onClick={handlePause}
              className="w-full h-14 flex items-center justify-center gap-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors shadow-lg text-lg font-semibold"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 4h3v12H6V4zm5 0h3v12h-3V4z" />
              </svg>
              PAUSE
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className="w-full h-14 flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-lg text-lg font-semibold"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 4l10 6-10 6V4z" />
              </svg>
              PLAY
            </button>
          )}

          {/* Stop Button - Wide */}
          <button
            onClick={handleStop}
            className="w-full h-12 mt-2 flex items-center justify-center gap-3 bg-gray-dark hover:bg-gray-700 rounded-lg transition-colors text-base font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <rect x="6" y="6" width="8" height="8" />
            </svg>
            STOP
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="w-full h-10 mt-2 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-bold text-primary rounded-lg transition-colors text-sm font-medium"
          >
            Reset Mixer
          </button>
        </div>

        {/* Setlist Panel */}
        <SetlistPanel
          setlist={currentSetlist}
          currentIndex={currentSetlistIndex}
          onSongSelect={handleSetlistSongSelect}
        />
      </div>
    </div>
  );
}

// Helper function for time formatting
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
