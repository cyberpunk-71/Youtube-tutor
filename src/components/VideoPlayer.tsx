import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, RotateCcw, Camera, Bookmark, 
  ChevronLeft, ChevronRight, Minus, Maximize2, Minimize2, Video as VideoIcon, ChevronDown, ChevronUp, Sparkles, Volume2, Clock
} from 'lucide-react';
import type { VideoMetadata, VideoChapter } from '../types/tutor';
import { MathText } from '../utils/katexRenderer';
import { findActiveTranscript, getLiveSceneState } from '../utils/chapterHelper';

interface VideoPlayerProps {
  video: VideoMetadata;
  currentTime: number;
  onTimeUpdate: (seconds: number) => void;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCaptureFrame: (timestamp: number) => void;
  onSeekTo: (seconds: number) => void;
  activeChapter: VideoChapter | null;
  autoPausedAt: number | null;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  isFloatingPiP?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  currentTime,
  onTimeUpdate,
  isPaused,
  onPause,
  onResume,
  onCaptureFrame,
  onSeekTo,
  activeChapter,
  autoPausedAt,
  isMaximized,
  onToggleMaximize,
  isMinimized,
  onToggleMinimize,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  isFloatingPiP = false
}) => {
  const playerRef = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(video.duration || 600);
  const [isNotesExpanded, setIsNotesExpanded] = useState(true);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [video.id]);

  const initPlayer = () => {
    if (playerRef.current && playerRef.current.destroy) {
      playerRef.current.destroy();
    }

    const startSeconds = Math.floor(currentTime);

    playerRef.current = new window.YT.Player(`yt-player-${video.id}`, {
      videoId: video.id,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        enablejsapi: 1,
        start: startSeconds > 0 ? startSeconds : undefined,
        origin: window.location.origin
      },
      events: {
        onReady: (event: any) => {
          const dur = event.target.getDuration();
          if (dur > 0) setDuration(dur);
          if (startSeconds > 0) {
            event.target.seekTo(startSeconds, true);
          }
        },
        onStateChange: (event: any) => {
          if (event.data === 1) {
            onResume();
          } else if (event.data === 2) {
            try {
              const t = event.target?.getCurrentTime?.();
              if (typeof t === 'number' && !isNaN(t)) {
                onTimeUpdate(t);
              }
            } catch {}
            onPause();
          }
        }
      }
    });
  };

  // Synchronize player when isPaused prop changes (e.g. typing or auto-pause)
  useEffect(() => {
    if (playerRef.current) {
      if (isPaused && playerRef.current.pauseVideo) {
        try {
          playerRef.current.pauseVideo();
          const t = playerRef.current.getCurrentTime?.();
          if (typeof t === 'number' && !isNaN(t)) {
            onTimeUpdate(t);
          }
        } catch {}
      }
    }
  }, [isPaused, onTimeUpdate]);

  // Sync duration when video prop changes
  useEffect(() => {
    if (video.duration && video.duration > 0) {
      setDuration(video.duration);
    }
  }, [video.duration, video.id]);

  // Sync sub-second playback timer ONLY when YouTube player is actively PLAYING (state === 1)
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && !isPaused) {
        try {
          const state = playerRef.current.getPlayerState?.();
          if (state === 1) {
            const time = playerRef.current.getCurrentTime?.();
            if (typeof time === 'number' && !isNaN(time)) {
              onTimeUpdate(time);
            }
          }
        } catch {}
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPaused, onTimeUpdate]);

  const handleSeek = (seconds: number) => {
    const maxDur = duration > 0 ? duration : (video.duration || 1200);
    const safeSec = Math.max(0, Math.min(seconds, maxDur));
    if (playerRef.current && playerRef.current.seekTo) {
      try {
        playerRef.current.seekTo(safeSec, true);
      } catch {}
    }
    onTimeUpdate(safeSec);
    onSeekTo(safeSec);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const maxDur = duration > 0 ? duration : (video.duration || 1200);
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = pct * maxDur;
    handleSeek(targetSec);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Active spoken sentence from sub-second transcript
  const activeTranscript = findActiveTranscript(video.transcript, currentTime);

  // Minimized Slim Dock Mode
  if (isMinimized && !isFloatingPiP) {
    return (
      <div className="h-full w-full flex items-center justify-center p-2 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={onToggleMinimize}
          className="flex flex-col items-center gap-3 py-6 px-2 rounded-xl hover:bg-slate-50 transition-all text-slate-800 group cursor-pointer"
          title="Expand Video Player"
        >
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
            <VideoIcon className="w-4 h-4" />
          </div>
          <div className="[writing-mode:vertical-rl] font-semibold text-xs tracking-wider text-slate-700 flex items-center gap-2">
            <span>LECTURE VIDEO</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] [writing-mode:horizontal-tb]">
              {formatTime(currentTime)}
            </span>
          </div>
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800" />
        </button>
      </div>
    );
  }

  // Floating Picture-in-Picture (PiP) Mode
  if (isFloatingPiP) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-3 py-1.5 bg-slate-800 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-1.5 truncate">
            <VideoIcon className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate font-semibold">{video.title}</span>
          </div>
          <button
            onClick={onToggleMinimize}
            className="p-1 hover:bg-slate-700 rounded text-slate-300 cursor-pointer"
            title="Dock Video Back"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="aspect-video w-full">
          <div id={`yt-player-${video.id}`} className="w-full h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden select-none">
      {/* Top Panel Header */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm flex items-center justify-between gap-2 z-30 shrink-0">
        {/* Left: Title & Indicator */}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <VideoIcon className="w-3 h-3" />
          </div>
          <span className="font-semibold text-xs text-slate-900 truncate max-w-[220px]" title={video.title}>
            {video.title}
          </span>
        </div>

        {/* Right: Window & Frame Capture Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCaptureFrame(currentTime)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
            title="Inspect on-screen blackboard equations and diagrams"
          >
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>Blackboard OCR</span>
          </button>

          <button
            onClick={onToggleMaximize}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title={isMaximized ? "Restore" : "Maximize Video"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onToggleMinimize}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Minimize Video"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Content Body: Fit cleanly in Viewport with independent scroll */}
      <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-3">
        {/* Main YouTube IFrame Viewport */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-md shrink-0">
          <div id={`yt-player-${video.id}`} className="w-full h-full" />

          {/* Keystroke Auto-Pause Overlay Badge */}
          {autoPausedAt !== null && isPaused && (
            <div className="absolute top-3 left-3 z-30 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-blue-500/40 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-lg animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span>Paused at {formatTime(autoPausedAt)} · Screen Pinned</span>
            </div>
          )}
        </div>

        {/* Interactive Timeline Scrubber & Active Chapter Info */}
        <div className="space-y-1.5 shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-mono text-slate-900 font-bold">{formatTime(currentTime)}</span>
              <span className="text-slate-400">/ {formatTime(duration)}</span>
            </div>
            {activeChapter && (
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md font-mono">
                {formatTime(activeChapter.startTime)} - {formatTime(activeChapter.endTime)}
              </span>
            )}
          </div>

          {/* Clickable Multi-Chapter Progress Bar */}
          <div 
            ref={progressBarRef}
            onClick={handleTimelineClick}
            className="relative h-3 w-full bg-slate-200 rounded-full overflow-hidden flex cursor-pointer group shadow-inner"
            title="Click or drag anywhere to jump to timestamp"
          >
            {/* Active Playhead Fill */}
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-100 relative"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white shadow-xs" />
            </div>

            {/* Chapter Segment Dividers */}
            {video.chapters && video.chapters.length > 1 && video.chapters.map((ch, cIdx) => {
              const leftPct = (ch.startTime / duration) * 100;
              if (leftPct <= 0 || leftPct >= 100) return null;
              return (
                <div
                  key={cIdx}
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-400/60 z-10 pointer-events-none"
                  style={{ left: `${leftPct}%` }}
                />
              );
            })}
          </div>

          {/* Chapter Chips List (Jump to any section in 1-click) */}
          {video.chapters && video.chapters.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
              {video.chapters.map((ch, idx) => {
                const isActive = activeChapter?.id === ch.id || (currentTime >= ch.startTime && currentTime < ch.endTime);
                return (
                  <button
                    key={ch.id || idx}
                    onClick={() => handleSeek(ch.startTime)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{idx + 1}.</span>
                    <span className="truncate max-w-[140px]">{ch.title.split('(')[0].trim()}</span>
                    <span className="opacity-75 font-mono">({formatTime(ch.startTime)})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Spoken Words Ticker (Sub-Second Dynamic Speech Tracking) */}
        {activeTranscript && (
          <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2 shadow-2xs shrink-0">
            <Volume2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[10px] text-blue-600 font-semibold mb-0.5">
                <span>Instructor Spoken Dialogue @ {formatTime(currentTime)}</span>
                <span className="font-mono px-1 py-0.2 rounded bg-blue-100 text-blue-700">Live</span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed italic">
                "{activeTranscript.text}"
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Blackboard & Screen State Accordion (Sub-Second Reactive) */}
        {(() => {
          const liveScene = getLiveSceneState(video.chapters, video.transcript, currentTime);
          return (
            <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shadow-2xs shrink-0 transition-all">
              <button
                onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-900">Live Blackboard &amp; Screen State</span>
                  <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[10px] font-mono font-bold">
                    @{liveScene.timeFormatted}
                  </span>
                  {liveScene.stepNumber && liveScene.totalSteps && (
                    <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[10px] font-mono">
                      Step {liveScene.stepNumber}/{liveScene.totalSteps}
                    </span>
                  )}
                </div>
                {isNotesExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              </button>

              {isNotesExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-200 space-y-2.5 text-xs animate-in fade-in duration-200">
                  <div>
                    <h4 className="font-semibold text-blue-900 text-xs mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                      <span>{liveScene.stepTitle}</span>
                    </h4>
                    <p className="text-slate-700 leading-relaxed text-[11px] whitespace-pre-line bg-white p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                      {liveScene.blackboardNotes}
                    </p>
                  </div>

                  {liveScene.visibleEquations && liveScene.visibleEquations.length > 0 && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Active Formulas on Screen
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {liveScene.visibleEquations.length} equation{liveScene.visibleEquations.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {liveScene.visibleEquations.map((eq, eIdx) => (
                          <div
                            key={eIdx}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-blue-900 font-mono text-[11px] shadow-2xs hover:border-blue-300 transition-colors"
                          >
                            <MathText content={eq.startsWith('$') ? eq : `$${eq}$`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
