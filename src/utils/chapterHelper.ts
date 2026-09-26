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
  let matchedScene: any = null;
  let sceneIdx = 0;
  let totalSteps = 0;

  if (activeChapter?.microScenes && activeChapter.microScenes.length > 0) {
    const sorted = [...activeChapter.microScenes].sort((a, b) => a.startTime - b.startTime);
    totalSteps = sorted.length;
    matchedScene = sorted.find(ms => timestamp >= ms.startTime && timestamp < ms.endTime);
    
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
    sceneIdx = sorted.indexOf(matchedScene);
  }

  // 2. Synthesize dynamic step title and notes that adapt to every 2-3 seconds of speech and blackboard state
  let dynamicStepTitle = matchedScene?.stepTitle || `Lecture Demonstration @ ${timeFormatted}`;
  if (activeTranscript && activeTranscript.text) {
    if (matchedScene?.stepTitle) {
      dynamicStepTitle = `${matchedScene.stepTitle} (@ ${timeFormatted})`;
    } else {
      const shortText = activeTranscript.text.length > 60 ? activeTranscript.text.substring(0, 57) + '...' : activeTranscript.text;
      dynamicStepTitle = `Active Focus: "${shortText}"`;
    }
  }

  let dynamicNotes = '';
  if (matchedScene?.blackboardText) {
    dynamicNotes = `${matchedScene.blackboardText}`;
    if (activeTranscript?.text && !matchedScene.blackboardText.includes(activeTranscript.text)) {
      dynamicNotes = `[Spoken Dialogue @ ${timeFormatted}]: "${activeTranscript.text}"\n\n${matchedScene.blackboardText}`;
    }
  } else if (activeTranscript && activeTranscript.text) {
    dynamicNotes = `[Spoken Dialogue @ ${timeFormatted}]: "${activeTranscript.text}"\n\n${activeChapter?.blackboardContent ? `Chalkboard Content: ${activeChapter.blackboardContent}` : activeChapter?.summary || 'Interactive lecture analysis and worked problem solving.'}`;
  } else {
    dynamicNotes = activeChapter?.blackboardContent || activeChapter?.summary || 'Interactive lecture analysis and worked problem solving.';
  }

  const dynamicEquations = (matchedScene?.equations && matchedScene.equations.length > 0)
    ? matchedScene.equations
    : (activeChapter?.equations || []);

  return {
    timestamp,
    timeFormatted,
    activeChapterTitle,
    stepTitle: dynamicStepTitle,
    activeSpokenLine,
    surroundingContext,
    visibleEquations: dynamicEquations,
    blackboardNotes: dynamicNotes,
    stepNumber: matchedScene ? (matchedScene.activeStepNumber || (sceneIdx + 1)) : undefined,
    totalSteps: matchedScene ? (matchedScene.totalStepsInChapter || totalSteps) : undefined
  };
}
