// src/app/test-audio/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchSongBySlug } from '@/lib/api/wordpress';
import { cacheSong, isSongCached, getCachedTrack } from '@/lib/storage/db';
import { getAudioEngine } from '@/lib/audio/engine';
import { Song } from '@/lib/types';

export default function TestAudioPage() {
  const [song, setSong] = useState<Song | null>(null);
  const [cached, setCached] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    async function loadSong() {
      const data = await fetchSongBySlug('what-hes-done');
      if (data) {
        setSong(data);
        const isCached = await isSongCached(data.id);
        setCached(isCached);
      }
    }
    loadSong();
  }, []);

  const handleDownload = async () => {
    if (!song) return;

    setDownloading(true);
    setProgress(0);

    try {
      const tracks = song.tracks.map((t) => ({
        filename: t.converted_filename,
        url: t.url,
        size_mb: t.size_mb,
      }));

      // Simulate progress (real implementation would track actual download)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await cacheSong(song.id, song.slug, song.song_name, song, tracks);

      clearInterval(progressInterval);
      setProgress(100);
      setCached(true);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed!');
    } finally {
      setDownloading(false);
    }
  };

  const handleLoad = async () => {
    if (!song || !cached) return;

    try {
      const engine = getAudioEngine();
      await engine.loadSong(song.id, song.tracks);
      setLoaded(true);
      alert('Song loaded! Ready to play.');
    } catch (error) {
      console.error('Load failed:', error);
      alert('Failed to load song!');
    }
  };

  const handlePlay = () => {
    const engine = getAudioEngine();
    engine.play();
    setPlaying(true);
  };

  const handlePause = () => {
    const engine = getAudioEngine();
    engine.pause();
    setPlaying(false);
  };

  if (!song) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Audio Engine Test</h1>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">{song.song_name}</h2>
        <p className="text-sm text-gray-600">
          {song.tracks.length} tracks | {song.total_size_mb.toFixed(2)}MB
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1: Download */}
        <div className="border p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Step 1: Download to IndexedDB</h3>
          {cached ? (
            <p className="text-green-600">✓ Song is cached locally</p>
          ) : (
            <>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-secondary disabled:bg-gray-400"
              >
                {downloading ? `Downloading... ${progress}%` : 'Download Song'}
              </button>
            </>
          )}
        </div>

        {/* Step 2: Load into Audio Engine */}
        <div className="border p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Step 2: Load into Audio Engine</h3>
          {loaded ? (
            <p className="text-green-600">✓ Song loaded and ready</p>
          ) : (
            <button
              onClick={handleLoad}
              disabled={!cached || loaded}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-secondary disabled:bg-gray-400"
            >
              Load Song
            </button>
          )}
        </div>

        {/* Step 3: Play */}
        <div className="border p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Step 3: Play</h3>
          <div className="space-x-2">
            <button
              onClick={handlePlay}
              disabled={!loaded || playing}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              ▶ Play
            </button>
            <button
              onClick={handlePause}
              disabled={!playing}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:bg-gray-400"
            >
              ⏸ Pause
            </button>
          </div>
        </div>
      </div>

      {/* Step 4: Track Controls (Test) */}
        <div className="border p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Step 4: Test Track Controls</h3>
          {loaded && song && (
            <div className="space-y-2">
              {song.tracks.map((track) => (
                <div key={track.converted_filename} className="flex items-center gap-3">
                  <span className="w-40 text-sm">{track.display_name}</span>
                  <button
                    onClick={() => {
                      const engine = getAudioEngine();
                      const currentMuted = track.converted_filename === 'drums.m4a'; // example
                      engine.setTrackMuted(track.converted_filename, !currentMuted);
                    }}
                    className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                  >
                    Mute
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="100"
                    onChange={(e) => {
                      const engine = getAudioEngine();
                      engine.setTrackVolume(track.converted_filename, parseInt(e.target.value) / 100);
                    }}
                    className="w-48"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Track List */}
      <div className="mt-8">
        <h3 className="font-semibold mb-3">Tracks:</h3>
        <ul className="space-y-1 text-sm">
          {song.tracks.map((track) => (
            <li key={track.converted_filename} className="text-gray-600">
              {track.display_name} ({track.type}) - {track.size_mb.toFixed(2)}MB
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
