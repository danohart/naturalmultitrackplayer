// src/components/mixer/MixerContent.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchSongBySlug } from '@/lib/api/wordpress';
import { cacheSong, isSongCached } from '@/lib/storage/db';
import { getAudioEngine } from '@/lib/audio/engine';
import { Song } from '@/lib/types';
import MixerControls from '@/components/mixer/MixerControls';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

type LoadingState = 'idle' | 'checking-cache' | 'downloading' | 'loading-audio' | 'ready' | 'error';

export default function MixerContent() {
  const searchParams = useSearchParams();
  const songSlug = searchParams.get('song') || 'what-hes-done';

  const [song, setSong] = useState<Song | null>(null);
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
  }, [songSlug]);

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
    let downloadedSize = 0;

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      setLoadingMessage(`Downloading ${track.filename}... (${i + 1}/${tracks.length})`);

      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error(`Failed to download ${track.filename}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      const { db } = await import('@/lib/storage/db');
      await db.cachedTracks.put({
        songId: songData.id,
        trackFilename: track.filename,
        audioData: arrayBuffer,
        cachedAt: new Date().toISOString(),
      });

      downloadedSize += track.size_mb;
      const progress = 35 + Math.floor((downloadedSize / totalSize) * 25);
      setLoadingProgress(progress);
    }

    const { db } = await import('@/lib/storage/db');
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
    const currentMuted = trackStates[trackFilename]?.muted || false;
    const engine = getAudioEngine();
    engine.setTrackMuted(trackFilename, !currentMuted);

    setTrackStates((prev) => ({
      ...prev,
      [trackFilename]: { ...prev[trackFilename], muted: !currentMuted },
    }));
  }, [trackStates]);

  const handleSoloToggle = useCallback((trackFilename: string) => {
    const currentSolo = trackStates[trackFilename]?.solo || false;
    const newSoloState = !currentSolo;

    const engine = getAudioEngine();
    const newStates = { ...trackStates };

    Object.keys(newStates).forEach((filename) => {
      if (newSoloState) {
        const shouldMute = filename !== trackFilename;
        engine.setTrackMuted(filename, shouldMute);
        newStates[filename] = {
          ...newStates[filename],
          solo: filename === trackFilename,
        };
      } else {
        engine.setTrackMuted(filename, false);
        newStates[filename] = {
          ...newStates[filename],
          solo: false,
        };
      }
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
    <div className="min-h-screen bg-gray-lightest text-white pb-48">
      {/* Header with Song Info and Transport Controls */}
      <div className="bg-primary-alt border-b border-gray-dark p-4 sticky top-0 z-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-6">
            {/* Song Info - Left Side */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">{song.song_name}</h1>
              <div className="text-sm text-gray-light mt-1">
                {song.bpm && `${song.bpm} BPM`}
                {song.key && ` • Key: ${song.key}`}
                {song.time_signature && ` • ${song.time_signature}`}
              </div>
            </div>

            {/* Transport Controls - Right Side */}
            <div className="flex items-center gap-4">
              {/* Stop Button */}
              <button
                onClick={handleStop}
                className="w-12 h-12 flex items-center justify-center bg-gray-dark hover:bg-gray-700 rounded-lg transition-colors"
                title="Stop"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="6" y="6" width="8" height="8" />
                </svg>
              </button>

              {/* Play/Pause Button */}
              {isPlaying ? (
                <button
                  onClick={handlePause}
                  className="w-16 h-16 flex items-center justify-center bg-yellow-600 hover:bg-yellow-700 rounded-full transition-colors shadow-lg"
                  title="Pause"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 4h3v12H6V4zm5 0h3v12h-3V4z" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handlePlay}
                  className="w-16 h-16 flex items-center justify-center bg-green-600 hover:bg-green-700 rounded-full transition-colors shadow-lg"
                  title="Play"
                >
                  <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 4l10 6-10 6V4z" />
                  </svg>
                </button>
              )}

              {/* Current Time / Duration */}
              <div className="text-sm text-gray-light min-w-24 text-right">
                <div className="font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar - Below Song Info */}
          <div className="mt-8">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-10 bg-gray-dark rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>

      {/* Mixer Controls */}
      <MixerControls
        tracks={song.tracks}
        trackStates={trackStates}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        onSoloToggle={handleSoloToggle}
        onReset={handleReset}
        disabled={false}
      />
    </div>
  );
}

// Helper function for time formatting
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
