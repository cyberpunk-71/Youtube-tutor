import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, RotateCcw, Camera, Bookmark, 
  ChevronLeft, ChevronRight, Minus, Maximize2, Minimize2, Video as VideoIcon, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import type { VideoMetadata, VideoChapter } from '../types/tutor';

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
  const [duration, setDuration] = useState(video.duration || 600);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

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

  // Sync sub-second playback timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime && !isPaused) {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time)) {
          onTimeUpdate(time);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPaused, onTimeUpdate]);

  const handleSeek = (seconds: number) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seconds, true);
      onSeekTo(seconds);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Minimized Slim Dock Mode
  if (isMinimized && !isFloatingPiP) {
    return (
      <div className="h-full w-full flex items-center justify-center p-2 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={onToggleMinimize}
          className="flex flex-col items-center gap-3 py-6 px-2 rounded-xl hover:bg-slate-50 transition-all text-slate-800 group"
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
            className="p-1 hover:bg-slate-700 rounded text-slate-300"
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
        {/* Left: Reorder buttons & Title */}
        <div className="flex items-center gap-1.5">
          {canMoveLeft && (
            <button
              onClick={onMoveLeft}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title="Move Video Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 truncate">
            <div className="w-5 h-5 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <VideoIcon className="w-3 h-3" />
            </div>
            <span className="truncate max-w-[200px]">{video.title}</span>
          </div>

          {canMoveRight && (
            <button
              onClick={onMoveRight}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title="Move Video Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCaptureFrame(currentTime)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs transition-colors"
            title="Analyze Blackboard OCR Frame"
          >
            <Camera className="w-3 h-3 text-blue-600" />
            <span className="hidden sm:inline">Blackboard OCR</span>
          </button>

          <button
            onClick={onToggleMaximize}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors"
            title={isMaximized ? "Restore" : "Maximize Video"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onToggleMinimize}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors"
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
              <span>Paused at {formatTime(autoPausedAt)} · Question pinned</span>
            </div>
          )}
        </div>

        {/* Timeline Scrubber & Active Chapter */}
        <div className="space-y-1.5 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span className="font-mono text-slate-900 font-semibold">{formatTime(currentTime)}</span>
            <span className="text-slate-400 text-[11px]">{formatTime(duration)}</span>
          </div>

          {/* Chapter Bar */}
          <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden flex cursor-pointer">
            <div 
              className="h-full bg-blue-600 transition-all duration-150"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {activeChapter && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="font-semibold text-slate-800 truncate max-w-[260px]">
                {activeChapter.title}
              </span>
              <span className="text-[11px] text-blue-600 font-mono">
                {formatTime(activeChapter.startTime)} - {formatTime(activeChapter.endTime)}
              </span>
            </div>
          )}
        </div>

        {/* Collapsible Blackboard Formulas Card */}
        {activeChapter && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shadow-2xs shrink-0">
            <button
              onClick={() => setIsNotesExpanded(!isNotesExpanded)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Blackboard Notes &amp; Formulas</span>
              </div>
              {isNotesExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {isNotesExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-slate-200 space-y-2 text-xs">
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {activeChapter.blackboardContent || activeChapter.summary}
                </p>
                {activeChapter.equations && activeChapter.equations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeChapter.equations.map((eq, eIdx) => (
                      <span
                        key={eIdx}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] text-blue-700"
                      >
                        ${eq}$
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
