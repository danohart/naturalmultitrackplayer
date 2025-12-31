// src/components/mixer/MixerControls.tsx
'use client';

import { Track } from '@/lib/types';

interface MixerControlsProps {
  tracks: Track[];
  trackStates: Record<string, { volume: number; muted: boolean; solo: boolean }>;
  onVolumeChange: (trackFilename: string, volume: number) => void;
  onMuteToggle: (trackFilename: string) => void;
  onSoloToggle: (trackFilename: string) => void;
  onReset: () => void;
  disabled: boolean;
}

export default function MixerControls({
  tracks,
  trackStates,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onReset,
  disabled,
}: MixerControlsProps) {
  const renderTrack = (track: Track) => {
    const state = trackStates[track.converted_filename] || { volume: 1, muted: false, solo: false };
    const volumePercent = Math.round(state.volume * 100);

    return (
      <div
        key={track.converted_filename}
        className={`bg-primary-alt rounded-lg p-2 border-2 transition-all ${
          state.solo ? 'border-yellow-500' : state.muted ? 'border-red-500' : 'border-gray-dark'
        }`}
      >
        {/* Track Name */}
        <div className="text-center mb-3">
          <h3 className="font-semibold text-sm mb-1">{track.display_name}</h3>
          <span className="text-xs text-gray-light capitalize">{track.type}</span>
        </div>

        {/* Volume Slider (Vertical) */}
        <div className="flex justify-center mb-4">
          <div className="relative h-40 w-20 rounded-md bg-gray-700 overflow-hidden">
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
              className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed`}
              style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
            />
          </div>
        </div>

        {/* Volume Display */}
        <div className="text-center text-xs text-gray-400 mb-3">{volumePercent}%</div>

        {/* Mute/Solo Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => onMuteToggle(track.converted_filename)}
            disabled={disabled}
            className={`w-full py-2 px-3 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              state.muted
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {state.muted ? 'MUTED' : 'MUTE'}
          </button>

          <button
            onClick={() => onSoloToggle(track.converted_filename)}
            disabled={disabled}
            className={`w-full py-2 px-3 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              state.solo
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {state.solo ? 'SOLO' : 'SOLO'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pb-32">
     
      
      <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 gap-2">
        {tracks.map(renderTrack)}
      </div>
      {/* Reset Button */}
      <div className=" flex justify-end sticky mt-4 bottom-10">
        <button
          onClick={onReset}
          disabled={disabled}
          className="bg-secondary hover:bg-secondary-bold text-primary px-6 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
         >
          🔄 Reset All
        </button>
      </div>
    </div>
  );
}