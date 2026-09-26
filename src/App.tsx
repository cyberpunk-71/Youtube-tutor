import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar, type StudioLayoutPreset } from './components/Navbar';
import { VideoPlayer } from './components/VideoPlayer';
import { TutorChat } from './components/TutorChat';
import { BlackboardInspector } from './components/BlackboardInspector';
import { findActiveChapter, getLiveSceneState } from './utils/chapterHelper';
import type { 
  VideoMetadata, VideoChapter, TutorMessage, InteractiveDiagram, 
  BlackboardAnalysis, TutorMode, BlackboardBoundingBox,
  RecentVideoItem, AnswerDepthMode
} from './types/tutor';

type PanelKey = 'video' | 'chat';

// Local Storage Master Keys for 100% Reload/Reboot Persistence
const STORAGE_ACTIVE_SESSION = 'mytutor_active_session_v1';
const STORAGE_RECENT_VIDEOS = 'mytutor_recent_videos_v1';
const STORAGE_CHAT_MESSAGES = 'mytutor_chat_messages_v1';
const STORAGE_LAYOUT_CONFIG = 'mytutor_layout_config_v1';
const STORAGE_ANSWER_DEPTH = 'mytutor_answer_depth_v1';

export const App: React.FC = () => {
  const [library, setLibrary] = useState<VideoMetadata[]>([]);
  
  // 1. Synchronous Lazy State Initializers for Instant 100% Reload/Reboot Restoration
  const [recentVideos, setRecentVideos] = useState<RecentVideoItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_RECENT_VIDEOS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [currentVideo, setCurrentVideo] = useState<VideoMetadata | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_ACTIVE_SESSION);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.video) return parsed.video;
      }
    } catch {}
    return null;
  });

  const [currentTime, setCurrentTime] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_ACTIVE_SESSION);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.timestamp !== undefined) return Number(parsed.timestamp) || 0;
      }
    } catch {}
    return 0;
  });

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [autoPausedAt, setAutoPausedAt] = useState<number | null>(null);
  
  // Persistent Chat Messages
  const [messages, setMessages] = useState<TutorMessage[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_CHAT_MESSAGES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [currentMode, setCurrentMode] = useState<TutorMode>('explain');
  const [answerDepth, setAnswerDepth] = useState<AnswerDepthMode>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_ANSWER_DEPTH);
      if (raw === 'quick' || raw === 'medium' || raw === 'detailed') return raw;
    } catch {}
    return 'medium';
  });

  const handleUpdateAnswerDepth = (depth: AnswerDepthMode) => {
    setAnswerDepth(depth);
    try {
      localStorage.setItem(STORAGE_ANSWER_DEPTH, depth);
    } catch {}
  };

  const [blackboardAnalysis, setBlackboardAnalysis] = useState<BlackboardAnalysis | null>(null);

  // Blackboard OCR Frame Modal
  const [isOcrModalOpen, setIsOcrModalOpen] = useState<boolean>(false);

  // Loading states
  const [isLoadingVideo, setIsLoadingVideo] = useState<boolean>(false);
  const [isLoadingTutor, setIsLoadingTutor] = useState<boolean>(false);
  const [isLoadingOcr, setIsLoadingOcr] = useState<boolean>(false);

  // 2-Column Panel Layout State (Video left, Chat right)
  const [activeLayoutPreset, setActiveLayoutPreset] = useState<StudioLayoutPreset>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_LAYOUT_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.activeLayoutPreset) return parsed.activeLayoutPreset;
      }
    } catch {}
    return 'balanced';
  });

  const [panelWidths, setPanelWidths] = useState<{ video: number; chat: number }>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_LAYOUT_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.panelWidths?.video && parsed?.panelWidths?.chat) {
          return parsed.panelWidths;
        }
      }
    } catch {}
    return { video: 58, chat: 42 };
  });

  const [minimizedPanels, setMinimizedPanels] = useState<{ video: boolean; chat: boolean }>({
    video: false,
    chat: false
  });

  const [maximizedPanel, setMaximizedPanel] = useState<PanelKey | null>(null);

  // Splitter Dragging State
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [initialWidths, setInitialWidths] = useState<{ video: number; chat: number }>({ ...panelWidths });

  // Fast Refs for zero-latency beforeunload/reboot flush
  const currentVideoRef = useRef<VideoMetadata | null>(currentVideo);
  const currentTimeRef = useRef<number>(currentTime);

  useEffect(() => {
    currentVideoRef.current = currentVideo;
  }, [currentVideo]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // 1. Initial Load: Fetch Library without overwriting restored session
  useEffect(() => {
    fetch('/api/library')
      .then(res => res.json())
      .then(data => {
        if (data.library && data.library.length > 0) {
          setLibrary(data.library);
          
          // Update chapters and transcript from fresh library while keeping user's playback timestamp
          setCurrentVideo(prev => {
            if (prev) {
              const fresh = data.library.find((l: VideoMetadata) => l.id === prev.id);
              if (fresh) {
                return {
                  ...prev,
                  title: fresh.title,
                  chapters: fresh.chapters,
                  transcript: fresh.transcript
                };
              }
              return prev;
            }
            return data.library[0];
          });

          // Seed recent videos if empty
          setRecentVideos(prev => {
            if (prev && prev.length > 0) return prev;
            const seeded: RecentVideoItem[] = data.library.slice(0, 5).map((v: VideoMetadata) => ({
              id: v.id,
              url: v.url,
              title: v.title,
              channel: v.channel,
              duration: v.duration,
              lastTimestamp: 0,
              thumbnail: v.thumbnail,
              lastWatchedAt: Date.now(),
              videoMetadata: v
            }));
            localStorage.setItem(STORAGE_RECENT_VIDEOS, JSON.stringify(seeded));
            return seeded;
          });
        }
      })
      .catch(err => {
        console.warn('Could not fetch library:', err);
      });
  }, []);

  // 2. Lifecycle Event Handlers for Immediate Unload / Session Restore Flushing
  useEffect(() => {
    const handleImmediateFlush = () => {
      if (currentVideoRef.current) {
        try {
          localStorage.setItem(STORAGE_ACTIVE_SESSION, JSON.stringify({
            video: currentVideoRef.current,
            timestamp: Math.floor(currentTimeRef.current),
            lastWatchedAt: Date.now()
          }));
        } catch (e) {
          console.warn('Error flushing state on unload:', e);
        }
      }
    };

    window.addEventListener('beforeunload', handleImmediateFlush);
    window.addEventListener('pagehide', handleImmediateFlush);
    
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleImmediateFlush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleImmediateFlush);
      window.removeEventListener('pagehide', handleImmediateFlush);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // 2. State Savers for Instant Reload / Crash Recovery
  const lastSaveTimeRef = useRef<number>(0);
  const savePlaybackState = useCallback((video: VideoMetadata | null, time: number) => {
    if (!video) return;

    try {
      // Save active session
      localStorage.setItem(STORAGE_ACTIVE_SESSION, JSON.stringify({
        video,
        timestamp: Math.floor(time),
        lastWatchedAt: Date.now()
      }));

      // Update matching item in recent videos
      setRecentVideos(prev => {
        const exists = prev.some(item => item.id === video.id);
        let updated: RecentVideoItem[];
        if (exists) {
          updated = prev.map(item => {
            if (item.id === video.id) {
              return {
                ...item,
                lastTimestamp: Math.floor(time),
                lastWatchedAt: Date.now(),
                videoMetadata: video
              };
            }
            return item;
          });
        } else {
          const newItem: RecentVideoItem = {
            id: video.id,
            url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
            title: video.title,
            channel: video.channel,
            duration: video.duration,
            lastTimestamp: Math.floor(time),
            thumbnail: video.thumbnail,
            lastWatchedAt: Date.now(),
            videoMetadata: video
          };
          updated = [newItem, ...prev].slice(0, 5);
        }
        localStorage.setItem(STORAGE_RECENT_VIDEOS, JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.warn('Error saving playback state:', e);
    }
  }, []);

  // Sync and save chat messages to localStorage
  const updateMessages = (newMessagesOrFn: TutorMessage[] | ((prev: TutorMessage[]) => TutorMessage[])) => {
    setMessages(prev => {
      const next = typeof newMessagesOrFn === 'function' ? newMessagesOrFn(prev) : newMessagesOrFn;
      try {
        localStorage.setItem(STORAGE_CHAT_MESSAGES, JSON.stringify(next));
      } catch (e) {
        console.warn('Error saving messages:', e);
      }
      return next;
    });
  };

  // Periodic and Event-Driven State Saver
  const handleTimeUpdate = (seconds: number) => {
    setCurrentTime(seconds);
    const now = Date.now();
    if (now - lastSaveTimeRef.current > 1500) {
      lastSaveTimeRef.current = now;
      savePlaybackState(currentVideo, seconds);
    }
  };

  // Compute active chapter
  const activeChapter: VideoChapter | null = findActiveChapter(currentVideo?.chapters, currentTime);

  // Handle URL Load (User inputs new YouTube URL)
  const handleLoadUrl = async (url: string) => {
    setIsLoadingVideo(true);
    try {
      const resp = await fetch('/api/video/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!resp.ok) {
        throw new Error('Failed to load video information');
      }

      const meta = await resp.json() as VideoMetadata;
      setCurrentVideo(meta);
      setCurrentTime(0);
      setAutoPausedAt(null);

      // Add to recent videos history (max 5 items)
      const newItem: RecentVideoItem = {
        id: meta.id,
        url: meta.url || url,
        title: meta.title,
        channel: meta.channel,
        duration: meta.duration,
        lastTimestamp: 0,
        thumbnail: meta.thumbnail,
        lastWatchedAt: Date.now(),
        videoMetadata: meta
      };

      setRecentVideos(prev => {
        const filtered = prev.filter(item => item.id !== meta.id);
        const updated = [newItem, ...filtered].slice(0, 5);
        localStorage.setItem(STORAGE_RECENT_VIDEOS, JSON.stringify(updated));
        return updated;
      });

      localStorage.setItem(STORAGE_ACTIVE_SESSION, JSON.stringify({
        video: meta,
        timestamp: 0,
        lastWatchedAt: Date.now()
      }));
    } catch (err: any) {
      alert(err.message || 'Error loading video URL');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  // Handle Selecting a Recent Video (Jump to exact left-off timestamp)
  const handleSelectRecentVideo = (item: RecentVideoItem) => {
    const freshLibVideo = library.find(l => l.id === item.id);
    const targetVideo = freshLibVideo || item.videoMetadata || {
      id: item.id,
      url: item.url,
      title: item.title,
      channel: item.channel,
      duration: item.duration,
      thumbnail: item.thumbnail,
      chapters: []
    };

    setCurrentVideo(targetVideo);
    const resumeTime = item.lastTimestamp || 0;
    setCurrentTime(resumeTime);
    setAutoPausedAt(null);

    // Update active session
    localStorage.setItem(STORAGE_ACTIVE_SESSION, JSON.stringify({
      video: targetVideo,
      timestamp: resumeTime,
      lastWatchedAt: Date.now()
    }));

    // Move to top of recent list
    setRecentVideos(prev => {
      const filtered = prev.filter(v => v.id !== item.id);
      const updatedItem = { ...item, lastWatchedAt: Date.now(), videoMetadata: targetVideo };
      const updated = [updatedItem, ...filtered].slice(0, 5);
      localStorage.setItem(STORAGE_RECENT_VIDEOS, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearRecentVideos = () => {
    if (confirm('Clear your recent video history?')) {
      setRecentVideos([]);
      localStorage.removeItem(STORAGE_RECENT_VIDEOS);
    }
  };

  // Keystroke Auto-Pause Trigger
  const handleTypingStart = () => {
    setIsPaused(true);
    setAutoPausedAt(currentTime);
  };

  const handleResumeVideo = () => {
    setIsPaused(false);
    setAutoPausedAt(null);
  };

  const handleSeekTo = (seconds: number) => {
    setCurrentTime(seconds);
    savePlaybackState(currentVideo, seconds);
  };

  // Send Chat Message with Full Conversation History & Live Video Screen Context
  const handleSendMessage = async (text: string, mode: TutorMode, imageBase64?: string | null) => {
    const userMsg: TutorMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: currentTime,
      createdAt: new Date(),
      mode,
      answerDepth
    };

    // Construct conversation history for multi-turn reasoning
    const updatedHistory = [...messages, userMsg];
    updateMessages(updatedHistory);
    setIsLoadingTutor(true);

    try {
      const activeChapter = findActiveChapter(currentVideo?.chapters, currentTime);
      const activeMicroScene = getLiveSceneState(currentVideo?.chapters, currentVideo?.transcript, currentTime);

      const coveredChapters = currentVideo?.chapters
        ?.filter(ch => ch.startTime <= currentTime)
        .map(ch => ch.title) || [];

      const nearbyTranscript = currentVideo?.transcript
        ?.filter(t => t.start <= currentTime + 60 && t.start + (t.duration || 15) >= currentTime - 90)
        .map(t => `[${Math.floor(t.start/60)}:${String(Math.floor(t.start%60)).padStart(2,'0')}] ${t.text}`)
        .join(' ') || '';

      const frameUrl = currentVideo?.thumbnail || (currentVideo?.id ? `https://i.ytimg.com/vi/${currentVideo.id}/hqdefault.jpg` : undefined);

      const chatHistoryForBackend = updatedHistory.slice(-8).map(m => ({
        role: m.role,
        content: m.content
      }));

      const resp = await fetch('/api/tutor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          mode,
          answerDepth,
          timestamp: currentTime,
          videoId: currentVideo?.id,
          blackboardFrameBase64: imageBase64 || undefined,
          frameUrl,
          videoTitle: currentVideo?.title || 'Lecture',
          channel: currentVideo?.channel || 'Instructor',
          chapters: currentVideo?.chapters || [],
          coveredHistory: coveredChapters,
          nearbyTranscript,
          activeChapter,
          activeMicroScene,
          chatHistory: chatHistoryForBackend
        })
      });

      if (!resp.ok) throw new Error('Tutor query failed');

      const data = await resp.json() as any;

      const assistantMsg: TutorMessage = {
        id: `msg-${Date.now()}-reply`,
        role: 'assistant',
        content: data.content || 'Here is the explanation for this moment in the video.',
        timestamp: currentTime,
        createdAt: new Date(),
        mode,
        answerDepth,
        diagram: data.diagram?.svgMarkup ? data.diagram : null,
        quiz: data.quiz,
        suggestedPrompts: data.suggestedPrompts
      };

      updateMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error querying tutor:', err);
      updateMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: 'I had a momentary hiccup connecting to the reasoning engine. Please ask again!',
          timestamp: currentTime,
          createdAt: new Date()
        }
      ]);
    } finally {
      setIsLoadingTutor(false);
    }
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (confirm('Clear the current chat conversation history?')) {
      setMessages([]);
      try {
        localStorage.removeItem(STORAGE_CHAT_MESSAGES);
      } catch (e) {
        console.warn('Error clearing chat history:', e);
      }
    }
  };

  // Blackboard Frame OCR
  const handleCaptureFrame = async (timestamp: number) => {
    setIsLoadingOcr(true);
    setIsOcrModalOpen(true);

    try {
      const resp = await fetch('/api/tutor/analyze-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: currentVideo?.id || 'video',
          timestamp,
          videoTitle: currentVideo?.title || 'Lecture',
          chapterContext: activeChapter?.title || 'Lecture Segment'
        })
      });

      if (resp.ok) {
        const analysis = await resp.json() as BlackboardAnalysis;
        setBlackboardAnalysis(analysis);
      }
    } catch (err) {
      console.error('Error analyzing blackboard frame:', err);
    } finally {
      setIsLoadingOcr(false);
    }
  };

  const handleAskAboutBox = (box: BlackboardBoundingBox) => {
    const question = `Can you explain this blackboard equation: ${box.latex || box.content}?`;
    handleSendMessage(question, 'blackboard_ocr');
  };

  const handleToggleMinimize = (panel: PanelKey) => {
    setMinimizedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
    if (maximizedPanel === panel) {
      setMaximizedPanel(null);
    }
  };

  const handleToggleMaximize = (panel: PanelKey) => {
    if (maximizedPanel === panel) {
      setMaximizedPanel(null);
    } else {
      setMaximizedPanel(panel);
      setMinimizedPanels({ video: false, chat: false });
    }
  };

  const handleSelectLayoutPreset = (preset: StudioLayoutPreset) => {
    setActiveLayoutPreset(preset);
    setMaximizedPanel(null);
    setMinimizedPanels({ video: false, chat: false });

    let newWidths = { video: 58, chat: 42 };
    if (preset === 'cinema') {
      newWidths = { video: 72, chat: 28 };
    } else if (preset === 'chat') {
      newWidths = { video: 40, chat: 60 };
    }

    setPanelWidths(newWidths);

    try {
      localStorage.setItem(STORAGE_LAYOUT_CONFIG, JSON.stringify({
        panelWidths: newWidths,
        activeLayoutPreset: preset
      }));
    } catch {}
  };

  const handleResetLayout = () => {
    handleSelectLayoutPreset('balanced');
  };

  // Draggable Splitter
  const startResizing = (clientX: number) => {
    setIsResizing(true);
    setDragStartX(clientX);
    setInitialWidths({ ...panelWidths });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const deltaX = e.clientX - dragStartX;
    const deltaPct = (deltaX / containerWidth) * 100;

    const newVideoWidth = Math.max(25, Math.min(80, initialWidths.video + deltaPct));
    const newChatWidth = Math.max(20, Math.min(75, 100 - newVideoWidth));

    const updatedWidths = {
      video: Number(newVideoWidth.toFixed(1)),
      chat: Number(newChatWidth.toFixed(1))
    };

    setPanelWidths(updatedWidths);
  };

  const stopResizing = () => {
    if (isResizing) {
      try {
        localStorage.setItem(STORAGE_LAYOUT_CONFIG, JSON.stringify({
          panelWidths,
          activeLayoutPreset
        }));
      } catch {}
    }
    setIsResizing(false);
  };

  // Flex / Width computation per panel
  const getPanelStyle = (key: PanelKey) => {
    if (maximizedPanel) {
      return maximizedPanel === key 
        ? { width: '100%', flex: '1 1 100%' } 
        : { display: 'none' };
    }

    if (minimizedPanels[key]) {
      return { width: '48px', flex: '0 0 48px' };
    }

    const widthPct = panelWidths[key] || (key === 'video' ? 58 : 42);
    return { width: `${widthPct}%`, flex: `${widthPct} ${widthPct} 0%` };
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      onMouseUp={stopResizing}
      className="h-screen w-screen flex flex-col bg-slate-100 text-slate-900 font-sans antialiased overflow-hidden"
    >
      {/* Fixed Height Studio Navigation Bar */}
      <Navbar
        currentVideo={currentVideo}
        currentTime={currentTime}
        onLoadUrl={handleLoadUrl}
        onSelectPreset={(v) => {
          setCurrentVideo(v);
          setCurrentTime(0);
          setAutoPausedAt(null);
          savePlaybackState(v, 0);
          try {
            localStorage.setItem(STORAGE_ACTIVE_SESSION, JSON.stringify({
              video: v,
              timestamp: 0,
              lastWatchedAt: Date.now()
            }));
          } catch {}
        }}
        presets={library}
        recentVideos={recentVideos}
        onSelectRecentVideo={handleSelectRecentVideo}
        onClearRecentVideos={handleClearRecentVideos}
        isLoading={isLoadingVideo}
        activeLayout={activeLayoutPreset}
        onSelectLayout={handleSelectLayoutPreset}
        onResetLayout={handleResetLayout}
      />

      {/* Main Viewport: Clean 2-Column Responsive Split (Video Left, Chat Right) */}
      <main 
        ref={containerRef}
        className="flex-1 w-full h-[calc(100vh-52px)] overflow-hidden flex flex-row p-2 gap-0 relative"
      >
        {/* 1. Video Player Column */}
        <div 
          style={getPanelStyle('video')}
          className="h-full overflow-hidden transition-all duration-150 px-1"
        >
          {currentVideo && (
            <VideoPlayer
              video={currentVideo}
              currentTime={currentTime}
              onTimeUpdate={handleTimeUpdate}
              isPaused={isPaused}
              onPause={() => {
                setIsPaused(true);
                savePlaybackState(currentVideo, currentTime);
              }}
              onResume={handleResumeVideo}
              onCaptureFrame={handleCaptureFrame}
              onSeekTo={handleSeekTo}
              activeChapter={activeChapter}
              autoPausedAt={autoPausedAt}
              isMaximized={maximizedPanel === 'video'}
              onToggleMaximize={() => handleToggleMaximize('video')}
              isMinimized={minimizedPanels.video}
              onToggleMinimize={() => handleToggleMinimize('video')}
              canMoveLeft={false}
              canMoveRight={false}
              onMoveLeft={() => {}}
              onMoveRight={() => {}}
            />
          )}
        </div>

        {/* Interactive Splitter Resize Handle */}
        {!maximizedPanel && !minimizedPanels.video && !minimizedPanels.chat && (
          <div
            onMouseDown={(e) => startResizing(e.clientX)}
            onDoubleClick={() => handleResetLayout()}
            className={`resizer-splitter h-full flex items-center justify-center group ${
              isResizing ? 'resizing' : ''
            }`}
            title="Drag to resize Video and Chat · Double-click to reset"
          >
            <div className="w-1 h-10 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors" />
          </div>
        )}

        {/* 2. MyTutor AI Chat Column */}
        <div 
          style={getPanelStyle('chat')}
          className="h-full overflow-hidden transition-all duration-150 px-1"
        >
          <TutorChat
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingTutor}
            currentTime={currentTime}
            onTypingStart={handleTypingStart}
            onSeekTo={handleSeekTo}
            currentMode={currentMode}
            onChangeMode={setCurrentMode}
            answerDepth={answerDepth}
            onChangeAnswerDepth={handleUpdateAnswerDepth}
            onClearChat={handleClearChat}
            isMaximized={maximizedPanel === 'chat'}
            onToggleMaximize={() => handleToggleMaximize('chat')}
            isMinimized={minimizedPanels.chat}
            onToggleMinimize={() => handleToggleMinimize('chat')}
            canMoveLeft={false}
            canMoveRight={false}
            onMoveLeft={() => {}}
            onMoveRight={() => {}}
          />
        </div>
      </main>

      {/* Blackboard OCR Modal */}
      <BlackboardInspector
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        analysis={blackboardAnalysis}
        frameUrl={currentVideo ? `https://i.ytimg.com/vi/${currentVideo.id}/hqdefault.jpg` : undefined}
        onAskAboutBox={handleAskAboutBox}
        isLoading={isLoadingOcr}
        timestamp={currentTime}
      />
    </div>
  );
};
export default App;
