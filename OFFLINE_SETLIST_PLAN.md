# Implementation Plan: Offline Setlist Caching for Live Performance

## Overview
Enable automatic offline caching of setlist songs for reliable live performance on iPad. When users create a setlist with internet, all songs will be downloaded automatically so they can perform the next day without any internet connection issues.

**Future Migration Note**: This implementation is designed for web browsers but will be wrapped with Capacitor/Ionic for native app distribution. The architecture uses an abstraction layer to make migration easier - storage logic is isolated in modules that can be swapped for native filesystem APIs later.

## User Requirements (Confirmed)
1. ✅ **Auto-download**: Songs automatically download when added to setlist
2. ✅ **Block playback**: If songs aren't cached, show clear error and prevent playback
3. ✅ **Live performance ready**: Zero tolerance for failures on iPad

## Storage Strategy: Web → Capacitor Migration Path

**Current (Web)**: IndexedDB with ~500MB-1GB Safari quota limit (10-20 songs max)
**Future (Capacitor)**: Hybrid approach for enterprise-scale setlists

### Migration Architecture
- **Metadata**: Keep in IndexedDB (song info, setlist data, cache status)
- **Audio files**: Migrate to native filesystem via Capacitor Filesystem plugin
- **Quota**: Increase from ~10-20 songs to 100+ songs (limited only by device storage)

### Capacitor Plugins Required
- `@capacitor/filesystem` - Native file storage with full device capacity
- `@capacitor/network` - Better connectivity detection for download triggers
- `@capacitor/background-task` - Continue downloads when app backgrounded/locked

### Benefits After Capacitor
- ✅ Cache 100+ songs instead of 10-20
- ✅ Background downloads continue when app is closed
- ✅ No browser cache eviction risk
- ✅ Storage visible in iPad Settings → [App Name]
- ✅ Better offline reliability for live performance

---

## Current State Analysis

### What Works ✅
- Songs can be manually cached when opening mixer (MixerContent.tsx:127-192)
- Cached songs stored in IndexedDB with all track audio data
- Audio engine preloads already-cached setlist songs for fast switching
- Service worker caches static assets

### Critical Gap ❌
**setlist/[id]/page.tsx:72-82** - `handleAddSongs` saves song slugs but does NOT trigger downloads

```typescript
const handleAddSongs = async (slugs: string[]) => {
  // Only saves metadata, no download triggered!
  const newSlugs = [...setlist.songSlugs, ...slugs];
  await handleSave({ ...setlist, songSlugs: newSlugs });
  const result = await fetchSongsBySlugs(newSlugs);
  setSongs(result.songs);
  setShowPicker(false);
};
```

## Implementation Strategy

### Phase 1: Core Download System (Critical Path)

#### 1.1 Create Download Manager
**New file**: `src/lib/storage/downloadManager.ts`

**Purpose**: Orchestrate background downloads with concurrency control

**Key features**:
- Limit to 2 concurrent downloads (prevent iPad memory issues)
- Queue-based processing
- Progress callbacks for UI updates
- Basic retry on failure (1 retry with 3-second delay)
- Storage quota check before download

**API**:
```typescript
class DownloadManager {
  async downloadSong(song: Song, onProgress?: (percent: number) => void): Promise<void>
  async downloadMultipleSongs(songs: Song[]): Promise<void>
  isDownloading(songId: number): boolean
  getProgress(songId: number): number
  cancelDownload(songId: number): void
}

export const downloadManager = new DownloadManager();
```

**Implementation notes**:
- Reuse existing download logic from MixerContent.tsx:161-179 (parallel track fetching)
- Use existing `db.cachedTracks.put()` and `db.cachedSongs.put()` functions
- Add chunking for large files (>50MB) to avoid iPad memory spikes
- Check `navigator.storage.estimate()` before downloads

**CAPACITOR MIGRATION PREP**:
- Abstract storage layer with interface pattern for easy plugin swap
- Create `src/lib/storage/storageAdapter.ts` interface:
  - Web implementation: IndexedDB (current)
  - Native implementation: Capacitor Filesystem API (future)
- This allows swapping storage backend without refactoring business logic

---

#### 1.2 Create Download State Store
**New file**: `src/store/useDownloadStore.ts`

**Purpose**: Centralized reactive state for download progress

**Store shape**:
```typescript
interface DownloadState {
  // songId -> download progress (0-100)
  progress: Record<number, number>;

  // songId -> is currently downloading
  activeDownloads: Set<number>;

  // songId -> cache status
  cacheStatus: Record<number, 'cached' | 'downloading' | 'not-cached' | 'error'>;

  // Actions
  setProgress: (songId: number, percent: number) => void;
  setCacheStatus: (songId: number, status: CacheStatus) => void;
  checkCacheStatus: (songId: number) => Promise<void>;
  checkMultipleCacheStatus: (songIds: number[]) => Promise<void>;
}
```

---

#### 1.3 Trigger Auto-Download on Setlist Add
**File**: `src/app/setlist/[id]/page.tsx`

**Modify**: `handleAddSongs` function (lines 72-82)

**Changes**:
```typescript
const handleAddSongs = async (slugs: string[]) => {
  if (!setlist) return;

  const newSlugs = [...setlist.songSlugs, ...slugs];
  await handleSave({ ...setlist, songSlugs: newSlugs });

  // Fetch full song data
  const result = await fetchSongsBySlugs(newSlugs);
  setSongs(result.songs);

  // NEW: Auto-download new songs
  const newSongs = result.songs.filter(s => slugs.includes(s.slug));

  for (const song of newSongs) {
    // Check if already cached
    const cached = await isSongCached(song.id);
    if (!cached) {
      // Start download in background (don't await)
      downloadManager.downloadSong(song, (percent) => {
        useDownloadStore.getState().setProgress(song.id, percent);
      }).catch(err => {
        console.error(`Failed to download ${song.song_name}:`, err);
        useDownloadStore.getState().setCacheStatus(song.id, 'error');
      });
    }
  }

  setShowPicker(false);

  // Show toast notification
  if (newSongs.length > 0) {
    // TODO: Add toast component
    console.log(`Downloading ${newSongs.length} song(s) in background...`);
  }
};
```

**Also add useEffect** to check cache status on mount:
```typescript
useEffect(() => {
  if (songs.length > 0) {
    // Check which songs are cached
    useDownloadStore.getState().checkMultipleCacheStatus(songs.map(s => s.id));
  }
}, [songs]);
```

---

### Phase 2: Pre-Performance Validation (Critical Path)

#### 2.1 Add Cache Validation Functions
**File**: `src/lib/storage/db.ts`

**Add new functions**:
```typescript
/**
 * Validate that all songs in a setlist are fully cached
 */
export async function validateSetlistCache(songIds: number[]): Promise<{
  allCached: boolean;
  cachedSongIds: number[];
  uncachedSongIds: number[];
}> {
  const cachedSongIds: number[] = [];
  const uncachedSongIds: number[] = [];

  for (const songId of songIds) {
    const cached = await isSongCached(songId);
    if (cached) {
      cachedSongIds.push(songId);
    } else {
      uncachedSongIds.push(songId);
    }
  }

  return {
    allCached: uncachedSongIds.length === 0,
    cachedSongIds,
    uncachedSongIds,
  };
}

/**
 * Check storage quota (for iPad storage warnings)
 *
 * CAPACITOR FUTURE: Use Filesystem.stat() to check device storage
 * instead of browser quota. Will need platform detection.
 */
export async function checkStorageQuota(): Promise<{
  available: number;
  used: number;
  quota: number;
  percentUsed: number;
} | null> {
  // Web browser check
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      available: (estimate.quota || 0) - (estimate.usage || 0),
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentUsed: estimate.quota ? (estimate.usage! / estimate.quota) * 100 : 0,
    };
  }

  // TODO Capacitor: Use Filesystem.stat() for device storage
  // import { Filesystem } from '@capacitor/filesystem';
  // const stats = await Filesystem.stat({ ... });

  return null;
}
```

---

#### 2.2 Block Playback If Cache Incomplete
**File**: `src/components/mixer/MixerContent.tsx`

**Modify**: Add new loading state (line 14):
```typescript
type LoadingState =
  | 'idle'
  | 'validating-cache'     // NEW
  | 'cache-incomplete'     // NEW
  | 'checking-cache'
  | 'downloading'
  | 'loading-audio'
  | 'ready'
  | 'error';
```

**Modify**: `initializeSong` function (add validation before line 133)

**Add validation logic**:
```typescript
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

    // NEW: If we're in a setlist, validate all songs are cached
    if (currentSetlist) {
      setLoadingState('validating-cache');
      setLoadingMessage('Validating offline cache...');

      const songIds = currentSetlist.songs.map(s => s.id);
      const validation = await validateSetlistCache(songIds);

      if (!validation.allCached) {
        // Block playback and show error
        setLoadingState('cache-incomplete');
        setError(
          `Cannot play offline: ${validation.uncachedSongIds.length} song(s) not downloaded. ` +
          `Download all setlist songs before performing.`
        );

        // Store missing songs for error UI
        setMissingCacheSongIds(validation.uncachedSongIds);
        return; // Stop here
      }
    }

    // Continue with normal flow...
    const initialStates = { /* ... */ };
    setTrackStates(initialStates);

    // Rest of existing logic...
  }
};
```

**Add state for missing songs**:
```typescript
const [missingCacheSongIds, setMissingCacheSongIds] = useState<number[]>([]);
```

---

#### 2.3 Cache Incomplete Error UI
**New file**: `src/components/mixer/CacheIncompleteError.tsx`

**Purpose**: Clear error screen when setlist isn't fully cached

**Component**:
```tsx
interface Props {
  setlist: HydratedSetlist;
  missingCacheSongIds: number[];
  onDownloadAll: () => void;
  onBackToSetlist: () => void;
}

export default function CacheIncompleteError({
  setlist,
  missingCacheSongIds,
  onDownloadAll,
  onBackToSetlist
}: Props) {
  const missingSongs = setlist.songs.filter(s =>
    missingCacheSongIds.includes(s.id)
  );

  const totalSize = missingSongs.reduce((sum, s) =>
    sum + s.total_size_mb, 0
  );

  return (
    <div className="fixed inset-0 bg-primary flex items-center justify-center z-50 p-4">
      <div className="max-w-lg w-full bg-primary-alt border-2 border-red-500 rounded-lg p-6">
        {/* Error icon */}
        <div className="text-center mb-4">
          <div className="text-6xl">⚠️</div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-2 text-center">
          Setlist Not Ready for Offline
        </h2>

        {/* Message */}
        <p className="text-gray-light text-center mb-4">
          {missingSongs.length} song{missingSongs.length !== 1 ? 's are' : ' is'} not downloaded.
          Download now to perform offline.
        </p>

        {/* Missing songs list */}
        <div className="bg-primary rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
          <p className="text-sm font-semibold text-gray-light mb-2">
            Missing Songs:
          </p>
          <ul className="space-y-1">
            {missingSongs.map(song => (
              <li key={song.id} className="text-sm text-white flex items-center gap-2">
                <span className="text-red-500">✕</span>
                <span>{song.song_name}</span>
                <span className="text-gray-light ml-auto">
                  {song.total_size_mb.toFixed(1)} MB
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Download info */}
        <p className="text-xs text-gray-light text-center mb-4">
          Total download size: {totalSize.toFixed(1)} MB
        </p>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onDownloadAll}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            Download All Now
          </button>

          <button
            onClick={onBackToSetlist}
            className="w-full bg-gray-dark hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            Back to Setlist
          </button>
        </div>

        {/* Warning */}
        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded">
          <p className="text-xs text-yellow-400 text-center">
            For live performance: Download all songs BEFORE going on stage
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Integrate in MixerContent.tsx** (replace LoadingOverlay when cache incomplete):
```typescript
if (loadingState === 'cache-incomplete') {
  return (
    <CacheIncompleteError
      setlist={currentSetlist!}
      missingCacheSongIds={missingCacheSongIds}
      onDownloadAll={async () => {
        const missingSongs = currentSetlist!.songs.filter(s =>
          missingCacheSongIds.includes(s.id)
        );

        await downloadManager.downloadMultipleSongs(missingSongs);

        // Retry initialization
        setLoadingState('checking-cache');
        initializeSong();
      }}
      onBackToSetlist={() => router.push(`/setlist/${currentSetlist!.id}`)}
    />
  );
}
```

---

### Phase 3: UI Indicators (High Priority)

#### 3.1 Cache Status Badge Component
**New file**: `src/components/ui/CacheStatusBadge.tsx`

**Purpose**: Show download status next to songs

```tsx
interface Props {
  songId: number;
  size?: 'sm' | 'md';
  showProgress?: boolean;
}

export default function CacheStatusBadge({ songId, size = 'md', showProgress = true }: Props) {
  const { cacheStatus, progress } = useDownloadStore(state => ({
    cacheStatus: state.cacheStatus[songId] || 'not-cached',
    progress: state.progress[songId] || 0,
  }));

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  if (cacheStatus === 'cached') {
    return (
      <span className={`${sizeClasses} bg-green-600 text-white rounded-full font-medium flex items-center gap-1`}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Cached
      </span>
    );
  }

  if (cacheStatus === 'downloading') {
    return (
      <span className={`${sizeClasses} bg-blue-600 text-white rounded-full font-medium flex items-center gap-1`}>
        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        {showProgress && `${Math.round(progress)}%`}
      </span>
    );
  }

  if (cacheStatus === 'error') {
    return (
      <span className={`${sizeClasses} bg-red-600 text-white rounded-full font-medium flex items-center gap-1`}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        Failed
      </span>
    );
  }

  return (
    <span className={`${sizeClasses} bg-gray-dark text-gray-light rounded-full font-medium flex items-center gap-1`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
      </svg>
      Not Cached
    </span>
  );
}
```

---

#### 3.2 Add Badge to Setlist Song Row
**File**: `src/components/setlist/SetlistSongRow.tsx`

**Add import and badge**:
```tsx
import CacheStatusBadge from '@/components/ui/CacheStatusBadge';

// In the render, add badge next to song name:
<div className="flex items-center gap-3">
  <h3 className="text-lg font-bold text-white">{song.song_name}</h3>
  <CacheStatusBadge songId={song.id} size="sm" />
</div>
```

---

#### 3.3 Global Download Progress Indicator
**New file**: `src/components/ui/GlobalDownloadProgress.tsx`

**Purpose**: Fixed bottom-right widget showing active downloads

```tsx
export default function GlobalDownloadProgress() {
  const { activeDownloads, progress } = useDownloadStore(state => ({
    activeDownloads: state.activeDownloads,
    progress: state.progress,
  }));

  const downloadingSongs = Array.from(activeDownloads);

  if (downloadingSongs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-primary-alt border-2 border-secondary rounded-lg p-3 shadow-lg z-40 max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-semibold text-white">
          Downloading {downloadingSongs.length} song{downloadingSongs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {downloadingSongs.slice(0, 3).map(songId => (
        <div key={songId} className="text-xs text-gray-light mb-1">
          <div className="flex justify-between mb-1">
            <span>Song {songId}</span>
            <span>{Math.round(progress[songId] || 0)}%</span>
          </div>
          <div className="w-full bg-gray-dark rounded-full h-1">
            <div
              className="bg-secondary h-full transition-all duration-300"
              style={{ width: `${progress[songId] || 0}%` }}
            />
          </div>
        </div>
      ))}

      {downloadingSongs.length > 3 && (
        <div className="text-xs text-gray-light mt-1">
          +{downloadingSongs.length - 3} more
        </div>
      )}
    </div>
  );
}
```

**Add to root layout** (`src/app/layout.tsx`):
```tsx
import GlobalDownloadProgress from '@/components/ui/GlobalDownloadProgress';

// In the body:
<GlobalDownloadProgress />
```

---

### Phase 4: iPad Optimizations (Critical for Live Performance)

#### 4.1 Memory Management in Download Manager
**File**: `src/lib/storage/downloadManager.ts`

**Web browser limits** (current implementation):
- 2 concurrent downloads on iPad (vs 3 on desktop)
- 50MB chunking threshold to avoid memory spikes
- Yield to browser every 10MB for garbage collection

**CAPACITOR NOTE**: After migration to native app:
- Can increase to 3-4 concurrent downloads (WebView still has limits)
- Increase chunking threshold to 100MB (native filesystem is more efficient)
- Background downloads continue when app is backgrounded/locked (using Background Task API)
- Memory pressure still matters in WebView but less restrictive

**Add iPad detection and optimizations**:
```typescript
class DownloadManager {
  private maxConcurrentDownloads: number;
  private isIPad: boolean;

  constructor() {
    // Detect iPad
    this.isIPad = typeof navigator !== 'undefined' &&
      /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;

    // Limit concurrent downloads on iPad
    this.maxConcurrentDownloads = this.isIPad ? 2 : 3;
  }

  private async downloadTrackWithChunking(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    // For large files on iPad, use chunked reading
    const contentLength = parseInt(response.headers.get('content-length') || '0');

    if (this.isIPad && contentLength > 50 * 1024 * 1024) {
      // Chunked download for files >50MB on iPad
      const reader = response.body!.getReader();
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Yield to browser every 10MB for garbage collection
        if (receivedLength % (10 * 1024 * 1024) === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Combine chunks
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      return allChunks.buffer;
    } else {
      // Standard download for smaller files
      return await response.arrayBuffer();
    }
  }
}
```

#### 4.2 Reduce Audio Engine Memory Cache on iPad
**File**: `src/lib/audio/engine.ts`

**Modify constructor** (around line 30):
```typescript
constructor() {
  // Detect iPad
  const isIPad = typeof navigator !== 'undefined' &&
    /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;

  // Reduce memory cache on iPad (5 vs 10 songs)
  this.maxCachedSongs = isIPad ? 5 : 10;
}
```

---

### Phase 5: Setlist-Level Actions (Medium Priority)

#### 5.1 Download All Button in Setlist Editor
**File**: `src/app/setlist/[id]/page.tsx`

**Add handler**:
```typescript
const handleDownloadAll = async () => {
  if (songs.length === 0) return;

  // Check which songs need downloading
  const needDownload: Song[] = [];
  for (const song of songs) {
    const cached = await isSongCached(song.id);
    if (!cached) {
      needDownload.push(song);
    }
  }

  if (needDownload.length === 0) {
    alert('All songs already cached!');
    return;
  }

  const totalSize = needDownload.reduce((sum, s) => sum + s.total_size_mb, 0);

  if (!confirm(
    `Download ${needDownload.length} song(s) for offline use? (${totalSize.toFixed(1)} MB)`
  )) {
    return;
  }

  // Trigger downloads
  await downloadManager.downloadMultipleSongs(needDownload);
};
```

**Add button in UI** (after "Add Songs" button, around line 218):
```tsx
<button
  onClick={handleDownloadAll}
  disabled={songs.length === 0}
  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
  </svg>
  Download All
</button>
```

---

## Capacitor Migration Roadmap (Future)

This plan implements storage using IndexedDB (web browser API). When ready to migrate to Capacitor for native distribution, follow this phased approach:

### Phase 1: Web Implementation (Current Plan)
Implement everything using IndexedDB as specified above. Focus on getting live performance reliability working in Safari first.

### Phase 2: Storage Abstraction Layer (Pre-Capacitor)
**Goal**: Prepare codebase for easy native migration without refactoring business logic

**Create**: `src/lib/storage/storageAdapter.ts`
```typescript
// Storage adapter interface
export interface StorageAdapter {
  saveSongAudio(songId: number, tracks: TrackData[]): Promise<void>;
  getSongAudio(songId: number): Promise<TrackData[] | null>;
  deleteSongAudio(songId: number): Promise<void>;
  isSongCached(songId: number): Promise<boolean>;
  getStorageInfo(): Promise<StorageInfo>;
}

// Web implementation (current)
class IndexedDBAdapter implements StorageAdapter { /* ... */ }

// Future native implementation
class CapacitorFilesystemAdapter implements StorageAdapter { /* ... */ }

// Export singleton with auto-detection
export const storage: StorageAdapter =
  isCapacitor() ? new CapacitorFilesystemAdapter() : new IndexedDBAdapter();
```

**Refactor**: Update all `db.cachedTracks.*` calls to use `storage.*` methods

**Benefit**: No behavior change, just architectural preparation. Makes Step 3 much easier.

---

### Phase 3: Capacitor Integration
**Goal**: Wrap web app as native iOS app with full device storage access

**Steps**:
1. **Install Capacitor**:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npm install @capacitor/ios @capacitor/filesystem @capacitor/network @capacitor/background-task
   npx cap init
   npx cap add ios
   ```

2. **Implement Native Storage Adapter**:
   - Use `@capacitor/filesystem` to save audio files to `Documents` directory
   - Keep metadata (song info, cache status) in IndexedDB for query speed
   - Files stored as: `Documents/songs/{songId}/track_{trackId}.mp3`

3. **Add Background Download Support**:
   ```typescript
   import { BackgroundTask } from '@capacitor/background-task';

   // Allow downloads to continue when app is backgrounded
   const taskId = await BackgroundTask.beforeExit(async () => {
     await downloadManager.downloadMultipleSongs(songs);
     BackgroundTask.finish({ taskId });
   });
   ```

4. **Migration Script for Existing Users**:
   - Detect cached songs in IndexedDB from web version
   - Copy to native filesystem in background
   - Show migration progress in UI
   - Delete from IndexedDB after successful copy

5. **Update Quota Checks**:
   - Remove 500MB web limits
   - Check device storage with `Filesystem.stat()`
   - Warn if device has <5GB free (not <500MB)

6. **Test Native Build**:
   - Open Xcode project: `npx cap open ios`
   - Test on physical iPad (simulators have different storage behavior)
   - Verify downloads continue when app is backgrounded
   - Test airplane mode reliability

---

### Phase 4: App Store Distribution
1. Configure code signing in Xcode
2. Add App Store icons and launch screens
3. Submit for TestFlight beta testing
4. Gather feedback from live performers
5. Submit to App Store

---

### Benefits After Full Migration

| Metric | Web Browser | Capacitor Native |
|--------|-------------|------------------|
| **Storage Limit** | 500MB-1GB | Device capacity (128GB+) |
| **Max Songs Cached** | 10-20 songs | 100+ songs |
| **Background Downloads** | ❌ Pauses when app closes | ✅ Continues in background |
| **Eviction Risk** | ⚠️ Browser can delete cache | ✅ User must explicitly delete |
| **Offline Reliability** | ⚠️ Good | ✅ Excellent |
| **Discovery** | Manual URL sharing | ✅ App Store search |
| **Installation** | Add to Home Screen | ✅ Native app install |

---

## Implementation Order

### Critical Path (Must implement before live use):
1. ✅ **Download Manager** (Phase 1.1) - Core download orchestration
2. ✅ **Download Store** (Phase 1.2) - Reactive state management
3. ✅ **Auto-download trigger** (Phase 1.3) - Download when adding songs
4. ✅ **Cache validation functions** (Phase 2.1) - Validate setlist cache
5. ✅ **Block playback** (Phase 2.2) - Prevent playback if not cached
6. ✅ **Error UI** (Phase 2.3) - Clear error screen with download option
7. ✅ **iPad optimizations** (Phase 4) - Memory management for iPad

### High Priority (Greatly improves UX):
8. ✅ **Cache status badges** (Phase 3.1-3.2) - Show download status
9. ✅ **Global download progress** (Phase 3.3) - Fixed widget showing progress

### Medium Priority (Nice to have):
10. ✅ **Download all button** (Phase 5.1) - Bulk download entire setlist

---

## Testing Checklist (Before Live Performance)

### Offline Functionality:
- [ ] Add 3-5 songs to setlist with WiFi, verify auto-download starts
- [ ] Wait for downloads to complete, verify all songs show "Cached" badge
- [ ] Turn on Airplane Mode
- [ ] Open mixer with setlist, verify all songs play perfectly
- [ ] Switch between setlist songs offline, verify instant switching
- [ ] Try to play setlist with 1 uncached song, verify error blocks playback

### iPad Specific:
- [ ] Download large setlist (5+ songs) on iPad, verify no crashes
- [ ] Monitor memory usage during downloads (should stay under 500MB)
- [ ] Test in Safari (not Chrome) - Safari has stricter storage limits
- [ ] Test with iPad in background for 10 mins during download
- [ ] Verify storage quota warnings if device nearly full

### Error Recovery:
- [ ] Turn off WiFi mid-download, verify retry happens
- [ ] Add song, cancel WiFi, verify error shown and can retry
- [ ] Fill device storage to 95%, verify warning before download

### Capacitor-Specific (After Native Migration):
- [ ] Download starts, background app for 5 minutes, verify continues
- [ ] Download starts, lock iPad, verify continues
- [ ] Check iPad Settings → [App Name] shows correct storage usage
- [ ] Test with 50+ song setlist (not possible in web version)
- [ ] Verify filesystem permissions requested on first launch
- [ ] Migrate from web-cached songs to native filesystem successfully
- [ ] Uninstall app, verify all downloaded songs are removed from device

---

## Files to Create/Modify

### New Files:
1. `src/lib/storage/downloadManager.ts` - Download orchestration
2. `src/store/useDownloadStore.ts` - Download state management
3. `src/components/ui/CacheStatusBadge.tsx` - Cache status indicator
4. `src/components/ui/GlobalDownloadProgress.tsx` - Download progress widget
5. `src/components/mixer/CacheIncompleteError.tsx` - Error screen component
6. `src/lib/storage/storageAdapter.ts` - **OPTIONAL FOR CAPACITOR PREP**: Storage abstraction interface

### Modified Files:
1. `src/app/setlist/[id]/page.tsx` - Add auto-download trigger + bulk download
2. `src/components/mixer/MixerContent.tsx` - Add cache validation before playback
3. `src/components/setlist/SetlistSongRow.tsx` - Add cache badge
4. `src/lib/storage/db.ts` - Add validation functions
5. `src/lib/audio/engine.ts` - Reduce memory cache on iPad
6. `src/app/layout.tsx` - Add global download progress widget

---

## Risk Mitigation

### Risk: Storage quota exceeded on iPad
**Mitigation**: Check quota before downloads, show warning at 80% full

### Risk: Network failure during download
**Mitigation**: Basic retry (1 attempt), clear error message, manual retry button

### Risk: App crashes from memory pressure
**Mitigation**: Chunked downloads for large files, max 2 concurrent on iPad, reduced audio cache

### Risk: Partial cache state (some tracks missing)
**Mitigation**: Download all tracks atomically, validate before allowing playback

---

## Success Criteria

### Web Version (Immediate):
✅ User creates setlist of 5 songs with internet → all download automatically
✅ Next day, user opens app in Airplane Mode → setlist plays perfectly
✅ If any song not cached → clear error blocks playback, shows "Download All" button
✅ iPad performance stable (no crashes, <500MB memory)
✅ Download progress visible throughout app (badges + progress widget)

### Capacitor Version (Future):
✅ User can cache 50+ song setlist without storage warnings
✅ Downloads continue in background when app is closed/locked
✅ App appears in App Store, can be installed natively
✅ Storage shows correctly in iPad Settings
✅ Existing web users can migrate cached songs to native filesystem

---

## Key Architectural Decision for Capacitor

**Storage Abstraction**: While not strictly required for the initial web implementation, consider creating the `storageAdapter.ts` interface during Phase 1.2 (Download Store). This adds minimal complexity now but makes the Capacitor migration 10x easier later.

**Trade-off**:
- **Without abstraction**: Faster initial implementation, but will need to refactor all storage calls when migrating to Capacitor
- **With abstraction**: Slightly more upfront code, but Capacitor migration is just implementing one new adapter class

**Recommendation**: Add the abstraction layer if you're confident about Capacitor migration within 6 months. Skip it if you want to validate the web version first and may not go native.
