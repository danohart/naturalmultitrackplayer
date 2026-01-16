// src/lib/setlist/sharing.ts

import { ShareableSetlist } from '../types';

const SHARE_VERSION = 1;

/**
 * Encode setlist data for URL sharing
 * Format: base64(JSON({ v: version, n: name, s: slugs[] }))
 */
export function encodeSetlistForSharing(name: string, slugs: string[]): string {
  const data = {
    v: SHARE_VERSION,
    n: name,
    s: slugs,
  };

  // JSON stringify -> UTF-8 encode -> base64 -> URL-safe
  const json = JSON.stringify(data);
  const base64 = btoa(
    encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );

  // Make URL-safe: replace + with -, / with _, remove =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode setlist data from URL
 */
export function decodeSetlistFromSharing(
  encoded: string
): ShareableSetlist | null {
  try {
    // Reverse URL-safe: restore + and /
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode base64 -> UTF-8 decode -> JSON parse
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const data = JSON.parse(json);

    if (data.v !== SHARE_VERSION) {
      console.warn('Setlist version mismatch, attempting parse anyway');
    }

    return {
      name: data.n || 'Imported Setlist',
      slugs: data.s || [],
    };
  } catch (error) {
    console.error('Failed to decode setlist:', error);
    return null;
  }
}

/**
 * Generate shareable URL for a setlist
 */
export function generateShareUrl(name: string, slugs: string[]): string {
  const encoded = encodeSetlistForSharing(name, slugs);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/setlist?import=${encoded}`;
}
