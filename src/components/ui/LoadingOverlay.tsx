// src/components/ui/LoadingOverlay.tsx

interface LoadingOverlayProps {
  state: 'idle' | 'checking-cache' | 'downloading' | 'loading-audio' | 'ready' | 'error';
  message: string;
  progress: number;
  error?: string | null;
}

export default function LoadingOverlay({ state, message, progress, error }: LoadingOverlayProps) {
  // Don't show overlay if idle or ready
  if (state === 'idle' || state === 'ready') {
    return null;
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-primary flex items-center justify-center z-50">
        <div className="text-center max-w-md">
          <div className="text-primary-bold text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-light mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-secondary hover:bg-secondary-bold text-primary px-6 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-primary flex items-center justify-center z-50">
      <div className="text-center max-w-md w-full px-6">
        {/* Spinner */}
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        </div>

        {/* Message */}
        <h2 className="text-xl font-semibold text-white mb-2">{message}</h2>

        {/* Progress Bar */}
        <div className="w-full bg-gray-dark rounded-full h-3 mb-2 overflow-hidden">
          <div
            className="bg-secondary h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Percentage */}
        <p className="text-sm text-gray-light">{progress}%</p>

        {/* State-specific messages */}
        <div className="mt-4 text-xs text-gray-light">
          {state === 'checking-cache' && 'Checking if song is already downloaded...'}
          {state === 'downloading' && 'Downloading tracks to your device for offline playback...'}
          {state === 'loading-audio' && 'Preparing audio for playback...'}
        </div>

        {/* Don't close warning */}
        {state === 'downloading' && (
          <div className="mt-4 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded text-xs text-yellow-400">
            ⚠️ Please don't close this page while downloading
          </div>
        )}
      </div>
    </div>
  );
}