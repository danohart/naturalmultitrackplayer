// src/lib/storage/downloadManager.ts

import { Song } from '@/lib/types';
import { db } from '@/lib/storage/db';
import { useDownloadStore } from '@/store/useDownloadStore';

interface DownloadQueueItem {
  song: Song;
  onProgress?: (percent: number) => void;
  resolve: () => void;
  reject: (error: Error) => void;
}

class DownloadManager {
  private queue: DownloadQueueItem[] = [];
  private activeDownloads = 0;
  private maxConcurrentDownloads: number;
  private isIPad: boolean;

  constructor() {
    // Detect iPad
    this.isIPad =
      typeof navigator !== 'undefined' &&
      /iPad|Macintosh/.test(navigator.userAgent) &&
      'ontouchend' in document;

    // Limit concurrent downloads on iPad to prevent memory issues
    this.maxConcurrentDownloads = this.isIPad ? 2 : 3;
  }

  /**
   * Download a single song with all its tracks
   */
  async downloadSong(
    song: Song,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ song, onProgress, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Download multiple songs (adds to queue)
   */
  async downloadMultipleSongs(songs: Song[]): Promise<void> {
    const promises = songs.map((song) => this.downloadSong(song));
    await Promise.all(promises);
  }

  /**
   * Check if a song is currently being downloaded
   */
  isDownloading(songId: number): boolean {
    const store = useDownloadStore.getState();
    return store.activeDownloads.has(songId);
  }

  /**
   * Get download progress for a song
   */
  getProgress(songId: number): number {
    const store = useDownloadStore.getState();
    return store.progress[songId] || 0;
  }

  /**
   * Cancel a download (removes from queue if not started)
   */
  cancelDownload(songId: number): void {
    const index = this.queue.findIndex((item) => item.song.id === songId);
    if (index !== -1) {
      const item = this.queue.splice(index, 1)[0];
      item.reject(new Error('Download cancelled'));

      const store = useDownloadStore.getState();
      store.removeActiveDownload(songId);
      store.setCacheStatus(songId, 'not-cached');
    }
  }

  private async processQueue(): Promise<void> {
    if (
      this.queue.length === 0 ||
      this.activeDownloads >= this.maxConcurrentDownloads
    ) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeDownloads++;
    const store = useDownloadStore.getState();

    try {
      store.addActiveDownload(item.song.id);
      store.setCacheStatus(item.song.id, 'downloading');
      store.setProgress(item.song.id, 0);

      await this.performDownload(item.song, item.onProgress);

      store.setCacheStatus(item.song.id, 'cached');
      store.setProgress(item.song.id, 100);
      item.resolve();
    } catch (error) {
      console.error(`Download failed for ${item.song.song_name}:`, error);

      // Retry once after 3 seconds
      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        await this.performDownload(item.song, item.onProgress);
        store.setCacheStatus(item.song.id, 'cached');
        store.setProgress(item.song.id, 100);
        item.resolve();
      } catch (retryError) {
        store.setCacheStatus(item.song.id, 'error');
        item.reject(
          retryError instanceof Error
            ? retryError
            : new Error('Download failed after retry')
        );
      }
    } finally {
      store.removeActiveDownload(item.song.id);
      this.activeDownloads--;
      this.processQueue(); // Process next item in queue
    }
  }

  private async performDownload(
    song: Song,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    // Check storage quota before downloading
    const quota = await this.checkStorageQuota();
    if (quota && quota.percentUsed > 80) {
      console.warn(
        `Storage ${quota.percentUsed.toFixed(0)}% full. Download may fail.`
      );
    }

    const tracks = song.tracks.map((t) => ({
      filename: t.converted_filename,
      url: t.url,
      size_mb: t.size_mb,
    }));

    const totalSize = tracks.reduce((sum, t) => sum + t.size_mb, 0);
    let downloadedSize = 0;

    // Download tracks in parallel (limited by maxConcurrentDownloads at manager level)
    const trackPromises = tracks.map(async (track) => {
      const arrayBuffer = await this.downloadTrackWithChunking(track.url);

      await db.cachedTracks.put({
        songId: song.id,
        trackFilename: track.filename,
        audioData: arrayBuffer,
        cachedAt: new Date().toISOString(),
      });

      downloadedSize += track.size_mb;
      const progress = Math.round((downloadedSize / totalSize) * 100);

      if (onProgress) {
        onProgress(progress);
      }

      const store = useDownloadStore.getState();
      store.setProgress(song.id, progress);

      return track.size_mb;
    });

    await Promise.all(trackPromises);

    // Save song metadata
    await db.cachedSongs.put({
      id: song.id,
      slug: song.slug,
      song_name: song.song_name,
      metadata: JSON.stringify(song),
      cached_at: new Date().toISOString(),
      total_size_mb: totalSize,
    });
  }

  private async downloadTrackWithChunking(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    // For large files on iPad, use chunked reading to avoid memory spikes
    const contentLength = parseInt(
      response.headers.get('content-length') || '0'
    );

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
        if (receivedLength % (10 * 1024 * 1024) < value.length) {
          await new Promise((resolve) => setTimeout(resolve, 50));
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

  private async checkStorageQuota(): Promise<{
    available: number;
    used: number;
    quota: number;
    percentUsed: number;
  } | null> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        available: (estimate.quota || 0) - (estimate.usage || 0),
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentUsed: estimate.quota
          ? (estimate.usage! / estimate.quota) * 100
          : 0,
      };
    }
    return null;
  }
}

// Export singleton instance
export const downloadManager = new DownloadManager();
