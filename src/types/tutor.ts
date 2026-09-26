export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  channel: string;
  channelUrl?: string;
  duration: number; // in seconds
  thumbnail: string;
  description?: string;
  chapters: VideoChapter[];
  transcript?: TranscriptItem[];
}

export interface VideoMicroScene {
  startTime: number;
  endTime: number;
  stepTitle: string;
  blackboardText: string;
  equations: string[];
  activeStepNumber?: number;
  totalStepsInChapter?: number;
}

export interface VideoChapter {
  id: string;
  chapterNumber: number;
  startTime: number;
  endTime: number;
  title: string;
  summary: string;
  blackboardContent?: string;
  equations?: string[];
  keyConcepts?: string[];
  microScenes?: VideoMicroScene[];
}

export interface TranscriptItem {
  start: number; // seconds
  duration: number; // seconds
  text: string;
}

export type TutorMode = 'explain' | 'quiz' | 'blackboard_ocr';

export type AnswerDepthMode = 'detailed' | 'medium' | 'quick';

export interface BlackboardBoundingBox {
  id: string;
  label: string;
  type: 'equation' | 'diagram' | 'text' | 'graph' | 'highlight';
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number;
  height: number;
  content: string;
  latex?: string;
}

export interface BlackboardAnalysis {
  timestamp: number;
  rawOcrText: string;
  equations: { latex: string; description: string }[];
  diagrams: { type: string; description: string }[];
  conceptsDetected: string[];
  explanation: string;
  boundingBoxes: BlackboardBoundingBox[];
}

export interface InteractiveDiagram {
  id: string;
  title: string;
  type: 'calculus_integral' | 'tangent_secant' | 'free_body_forces' | 'molecule_geometry' | 'binary_tree' | 'coordinate_graph' | 'custom_sketch';
  description: string;
  caption?: string;
  svgMarkup?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'free_form' | 'drawing_prompt';
  options?: string[];
  correctAnswerIndex?: number;
  explanation: string;
  hint?: string;
  targetedConcept: string;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // video timestamp in seconds where asked
  createdAt: Date;
  mode?: TutorMode;
  answerDepth?: AnswerDepthMode;
  blackboardFrameUrl?: string;
  ocrAnalysis?: BlackboardAnalysis;
  diagram?: InteractiveDiagram | null;
  quiz?: QuizQuestion;
  suggestedPrompts?: string[];
  isCheckResult?: boolean;
  isCorrect?: boolean;
}

// Spatial Whiteboard Canvas Nodes
export interface CanvasNode {
  id: string;
  type: 'ai_answer' | 'sticky_note' | 'diagram' | 'formula_callout';
  x: number; // canvas coordinate X
  y: number; // canvas coordinate Y
  width?: number;
  title: string;
  content: string; // Markdown with LaTeX
  diagramSvg?: string;
  timestamp?: number;
  color?: string;
  targetDrawingBox?: { x: number; y: number; width: number; height: number };
  createdAt: number;
}

export interface RecentVideoItem {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration: number;
  lastTimestamp: number;
  thumbnail: string;
  lastWatchedAt: number;
  videoMetadata?: VideoMetadata;
}
