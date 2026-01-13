'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Home, Music } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show navigation on home page or mixer (mixer uses full screen)
  if (pathname === '/' || pathname.startsWith('/mixer')) {
    return null;
  }

  const isLibraryPage = pathname === '/library';
  const isMixerPage = pathname.startsWith('/mixer');

  const handleBack = () => {
    if (isMixerPage) {
      router.push('/library');
    } else {
      router.push('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-primary border-b border-primary-alt/30 backdrop-blur-sm">
      <nav className="flex items-center justify-between px-4 h-16">
        {/* Left: Back/Home button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-lightest hover:bg-primary-alt/20 active:bg-primary-alt/30 transition-colors min-h-[44px] min-w-[44px]"
          aria-label={isMixerPage ? 'Back to library' : 'Back to home'}
        >
          {isMixerPage ? (
            <>
              <ArrowLeft size={24} />
              <span className="hidden sm:inline">Library</span>
            </>
          ) : (
            <>
              <Home size={24} />
              <span className="hidden sm:inline">Home</span>
            </>
          )}
        </button>

        <h1 className="text-lg sm:text-xl font-semibold text-gray-lightest flex items-center gap-2">
          <Music size={24} className="text-gray-lightest" />
          <span>Natural Mixer</span>
        </h1>

        {/* Right: Spacer for balance */}
        <div className="w-[44px] sm:w-24"></div>
      </nav>
    </header>
  );
}
