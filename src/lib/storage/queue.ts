// src/lib/storage/queue.ts

import { SetlistData } from '@/lib/types';
import { db } from './db';

export const QUEUE_ID = '__GLOBAL_QUEUE__';

/**
 * Get or create the global persistent queue
 */
export async function getOrCreateQueue(): Promise<SetlistData> {
  let queue = await db.setlists.get(QUEUE_ID);

  if (!queue) {
    queue = {
      id: QUEUE_ID,
      name: 'My Queue',
      songSlugs: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.setlists.put(queue);
  }

  return queue;
}

/**
 * Update the entire queue with new song slugs
 */
export async function updateQueue(songSlugs: string[]): Promise<void> {
  const queue = await getOrCreateQueue();
  queue.songSlugs = songSlugs;
  queue.updated_at = new Date().toISOString();
  await db.setlists.put(queue);
}

/**
 * Add songs to the end of the queue
 */
export async function addToQueue(songSlugs: string[]): Promise<void> {
  const queue = await getOrCreateQueue();
  queue.songSlugs = [...queue.songSlugs, ...songSlugs];
  queue.updated_at = new Date().toISOString();
  await db.setlists.put(queue);
}

/**
 * Remove a song from the queue by slug
 */
export async function removeFromQueue(songSlug: string): Promise<void> {
  const queue = await getOrCreateQueue();
  queue.songSlugs = queue.songSlugs.filter((slug) => slug !== songSlug);
  queue.updated_at = new Date().toISOString();
  await db.setlists.put(queue);
}

/**
 * Reorder the queue with new song slugs order
 */
export async function reorderQueue(newSlugs: string[]): Promise<void> {
  await updateQueue(newSlugs);
}
