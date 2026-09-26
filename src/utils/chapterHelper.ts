import type { VideoChapter, TranscriptItem } from '../types/tutor';

/**
 * Finds the exact active chapter for any timestamp (integer or float).
 * Eliminates gaps between chapters and boundary mismatches.
 */
export function findActiveChapter(chapters: VideoChapter[] | undefined, timestamp: number): VideoChapter | null {
  if (!chapters || chapters.length === 0) return null;
  if (chapters.length === 1) return chapters[0];

  const sorted = [...chapters].sort((a, b) => a.startTime - b.startTime);

  // 1. Direct range match [startTime, endTime]
  const exact = sorted.find(c => timestamp >= c.startTime && timestamp < c.endTime);
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

/**
 * Finds the exact spoken transcript item active at timestamp
 */
export function findActiveTranscript(transcript: TranscriptItem[] | undefined, timestamp: number): TranscriptItem | null {
  if (!transcript || transcript.length === 0) return null;

  // Find transcript item where start <= timestamp < start + duration (or closest within 4s)
  const exact = transcript.find(t => timestamp >= t.start && timestamp <= t.start + (t.duration || 10));
  if (exact) return exact;

  // Fallback to latest spoken item before timestamp
  for (let i = transcript.length - 1; i >= 0; i--) {
    if (timestamp >= transcript[i].start) {
      return transcript[i];
    }
  }

  return transcript[0];
}

/**
 * Returns surrounding spoken dialogue text in a window around timestamp
 */
export function getNearbyTranscriptText(
  transcript: TranscriptItem[] | undefined,
  timestamp: number,
  beforeSec: number = 60,
  afterSec: number = 30
): string {
  if (!transcript || transcript.length === 0) return '';

  return transcript
    .filter(t => t.start <= timestamp + afterSec && t.start + (t.duration || 10) >= timestamp - beforeSec)
    .map(t => {
      const min = Math.floor(t.start / 60);
      const sec = String(Math.floor(t.start % 60)).padStart(2, '0');
      return `[${min}:${sec}] ${t.text}`;
    })
    .join(' ');
}

/**
 * Micro-scene detail at exact second T
 */
export interface LiveSceneState {
  timestamp: number;
  timeFormatted: string;
  activeChapterTitle: string;
  stepTitle: string;
  activeSpokenLine: string;
  surroundingContext: string;
  visibleEquations: string[];
  blackboardNotes: string;
  stepNumber?: number;
  totalSteps?: number;
}

export function getLiveSceneState(
  chapters: VideoChapter[] | undefined,
  transcript: TranscriptItem[] | undefined,
  timestamp: number
): LiveSceneState {
  const min = Math.floor(timestamp / 60);
  const sec = String(Math.floor(timestamp % 60)).padStart(2, '0');
  const timeFormatted = `${min}:${sec}`;

  const activeChapter = findActiveChapter(chapters, timestamp);
  const activeTranscript = findActiveTranscript(transcript, timestamp);
  const surroundingContext = getNearbyTranscriptText(transcript, timestamp, 45, 20);

  const activeChapterTitle = activeChapter?.title || 'Lecture Scene';
  const activeSpokenLine = activeTranscript?.text || activeChapter?.summary || '';

  // 1. Check for explicit fine-grained micro-scenes
  if (activeChapter?.microScenes && activeChapter.microScenes.length > 0) {
    const sorted = [...activeChapter.microScenes].sort((a, b) => a.startTime - b.startTime);
    let matchedScene = sorted.find(ms => timestamp >= ms.startTime && timestamp < ms.endTime);
    
    if (!matchedScene) {
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (timestamp >= sorted[i].startTime) {
          matchedScene = sorted[i];
          break;
        }
      }
    }
    
    if (!matchedScene) {
      matchedScene = sorted[0];
    }

    const sceneIdx = sorted.indexOf(matchedScene);

    return {
      timestamp,
      timeFormatted,
      activeChapterTitle,
      stepTitle: matchedScene.stepTitle,
      activeSpokenLine,
      surroundingContext,
      visibleEquations: matchedScene.equations || [],
      blackboardNotes: matchedScene.blackboardText,
      stepNumber: matchedScene.activeStepNumber || (sceneIdx + 1),
      totalSteps: matchedScene.totalStepsInChapter || sorted.length
    };
  }

  // 2. Dynamic Synthesis for chapters without microScenes (arbitrary YouTube videos)
  // Dynamically filter relevant equations or synthesize step from active speech
  let dynamicStepTitle = `Lecture Demonstration @ ${timeFormatted}`;
  let dynamicNotes = activeChapter?.blackboardContent || activeChapter?.summary || 'Interactive lecture discussion and mathematical derivation.';
  let dynamicEquations = activeChapter?.equations || [];

  if (activeTranscript && activeTranscript.text) {
    dynamicStepTitle = `Active Focus: "${activeTranscript.text.length > 55 ? activeTranscript.text.substring(0, 52) + '...' : activeTranscript.text}"`;
    dynamicNotes = `${activeTranscript.text}\n\n${activeChapter?.blackboardContent ? `Chalkboard State: ${activeChapter.blackboardContent}` : ''}`;
  }

  return {
    timestamp,
    timeFormatted,
    activeChapterTitle,
    stepTitle: dynamicStepTitle,
    activeSpokenLine,
    surroundingContext,
    visibleEquations: dynamicEquations,
    blackboardNotes: dynamicNotes
  };
}
