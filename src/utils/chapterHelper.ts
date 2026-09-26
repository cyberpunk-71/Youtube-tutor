import type { VideoChapter } from '../types/tutor';

/**
 * Finds the exact active chapter for any timestamp (integer or float).
 * Eliminates 1-second gaps between chapters and boundary mismatches.
 */
export function findActiveChapter(chapters: VideoChapter[] | undefined, timestamp: number): VideoChapter | null {
  if (!chapters || chapters.length === 0) return null;
  if (chapters.length === 1) return chapters[0];

  const sorted = [...chapters].sort((a, b) => a.startTime - b.startTime);

  // 1. Direct range match [startTime, endTime]
  const exact = sorted.find(c => timestamp >= c.startTime && timestamp <= c.endTime);
  if (exact) return exact;

  // 2. Latest chapter whose startTime <= timestamp
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (timestamp >= sorted[i].startTime) {
      return sorted[i];
    }
  }

  // 3. Default to first chapter
  return sorted[0];
}
