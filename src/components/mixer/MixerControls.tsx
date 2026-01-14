// src/components/mixer/MixerControls.tsx
'use client';

import { Track } from '@/lib/types';

interface MixerControlsProps {
  tracks: Track[];
  trackStates: Record<string, { volume: number; muted: boolean; solo: boolean }>;
  onVolumeChange: (trackFilename: string, volume: number) => void;
  onMuteToggle: (trackFilename: string) => void;
  onSoloToggle: (trackFilename: string) => void;
  disabled: boolean;
}

export default function MixerControls({
  tracks,
  trackStates,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  disabled,
}: MixerControlsProps) {
  const renderTrack = (track: Track) => {
    const state = trackStates[track.converted_filename] || { volume: 1, muted: false, solo: false };
    const volumePercent = Math.round(state.volume * 100);

    return (
      <div
        key={track.converted_filename}
        className={`bg-primary-alt rounded-lg p-2 border-2 transition-all flex flex-col ${
          state.solo ? 'border-yellow-500' : state.muted ? 'border-red-500' : 'border-gray-dark'
        }`}
      >
        {/* Track Name */}
        <div className="text-center mb-2">
          <h3 className="font-semibold text-xs md:text-sm leading-tight">{track.display_name}</h3>
          <span className="text-xs text-gray-light capitalize">{track.type}</span>
        </div>

        {/* Volume Slider (Vertical) - flex-1 to fill available space */}
        <div className="flex justify-center flex-1 mb-2">
          <div className="relative w-full max-w-16 rounded-md bg-gray-700 overflow-hidden">
            <div
              className={`absolute bottom-0 w-full transition-all ${state.solo ? 'bg-yellow-500' : state.muted ? 'bg-red-500' : 'bg-secondary'}`}
              style={{ height: `${volumePercent}%` }}
            ></div>
            <input
              type="range"
              min="0"
              max="100"
              value={volumePercent}
              onChange={(e) => onVolumeChange(track.converted_filename, parseInt(e.target.value) / 100)}
              disabled={disabled}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              style={{ writingMode: 'vertical-lr', direction: 'rtl' } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Volume Display */}
        <div className="text-center text-xs text-gray-400 mb-2">{volumePercent}%</div>

        {/* Mute/Solo Buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => onMuteToggle(track.converted_filename)}
            disabled={disabled}
            className={`flex-1 py-2 rounded text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              state.muted
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <span className="md:hidden">M</span>
            <span className="hidden md:inline">MUTE</span>
          </button>

          <button
            onClick={() => onSoloToggle(track.converted_filename)}
            disabled={disabled}
            className={`flex-1 py-2 rounded text-xs md:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              state.solo
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <span className="md:hidden">S</span>
            <span className="hidden md:inline">SOLO</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full grid grid-cols-6 gap-2 p-2 auto-rows-fr">
      {tracks.map(renderTrack)}
    </div>
  );
}
