import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  HelpCircle, CheckCircle2, XCircle, ArrowRight,
  MessageSquare, Lightbulb, ChevronLeft, ChevronRight, Minus, Maximize2, Minimize2, ArrowDown, ChevronDown, Trash2,
  Camera, Image as ImageIcon, X
} from 'lucide-react';
import type { TutorMessage, TutorMode, QuizQuestion, AnswerDepthMode } from '../types/tutor';
import { MathText } from '../utils/katexRenderer';
import confetti from 'canvas-confetti';

interface TutorChatProps {
  messages: TutorMessage[];
  onSendMessage: (text: string, mode: TutorMode, imageBase64?: string | null) => void;
  isLoading: boolean;
  currentTime: number;
  onTypingStart: () => void;
  onSeekTo: (seconds: number) => void;
  currentMode: TutorMode;
  onChangeMode: (mode: TutorMode) => void;
  answerDepth: AnswerDepthMode;
  onChangeAnswerDepth: (depth: AnswerDepthMode) => void;
  onClearChat?: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

export const TutorChat: React.FC<TutorChatProps> = ({
  messages,
  onSendMessage,
  isLoading,
  currentTime,
  onTypingStart,
  onSeekTo,
  currentMode,
  onChangeMode,
  answerDepth,
  onChangeAnswerDepth,
  onClearChat,
  isMaximized,
  onToggleMaximize,
  isMinimized,
  onToggleMinimize,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isCapturingScreen, setIsCapturingScreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // --- Bulletproof scroll mechanism (Zero scroll locks, full manual scroll-up freedom) ---
  const userScrolledUpRef = useRef(false);

  // Detect manual scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget || scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distFromBottom > 35;
    setShowScrollBtn(isUp);
    userScrolledUpRef.current = isUp;
  };

  // Only auto-scroll when a new message arrives IF the user has NOT scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Jump to latest message
  const jumpToBottom = () => {
    userScrolledUpRef.current = false;
    setShowScrollBtn(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Clipboard Paste Support (Ctrl+V any screenshot directly into chat)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setAttachedImage(reader.result);
            }
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  // Live Screen Capture via Browser DisplayMedia API
  const handleCaptureScreen = async () => {
    try {
      setIsCapturingScreen(true);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' } as any
      });
      const track = stream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      await new Promise(resolve => setTimeout(resolve, 350));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setAttachedImage(dataUrl);
      track.stop();
    } catch (err) {
      console.warn('Screen capture cancelled or unavailable:', err);
    } finally {
      setIsCapturingScreen(false);
    }
  };

  // Local File Upload for Screenshots
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAttachedImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Speech Recognition for Voice Input
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          onSendMessage(transcript, currentMode, attachedImage);
          setAttachedImage(null);
        }
        setIsRecording(false);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, [currentMode, onSendMessage, attachedImage]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      onTypingStart();
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (e.target.value.length === 1) {
      onTypingStart();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((inputText.trim() || attachedImage) && !isLoading) {
      userScrolledUpRef.current = false;
      setShowScrollBtn(false);
      onSendMessage(
        inputText.trim() || (attachedImage ? 'Please analyze what is shown on this screen and solve or explain the problem step by step.' : ''),
        currentMode,
        attachedImage
      );
      setInputText('');
      setAttachedImage(null);
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  const speakText = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking === id) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[$#*_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);

    setIsSpeaking(id);
    window.speechSynthesis.speak(utterance);
  };

  const formatTimestamp = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Minimized Slim Dock Mode
  if (isMinimized) {
    return (
      <div className="h-full w-full flex items-center justify-center p-2 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={onToggleMinimize}
          className="flex flex-col items-center gap-3 py-6 px-2 rounded-xl hover:bg-slate-50 transition-all text-slate-800 group"
          title="Expand AI Tutor Chat"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="[writing-mode:vertical-rl] font-semibold text-xs tracking-wider text-slate-700 flex items-center gap-2">
            <span>AI TUTOR CHAT</span>
            {messages.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] [writing-mode:horizontal-tb]">
                {messages.length}
              </span>
            )}
          </div>
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden relative">
      {/* Top Panel Header */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm flex items-center justify-between gap-2 z-30 shrink-0">
        {/* Left: Reorder buttons & Title */}
        <div className="flex items-center gap-1.5">
          {canMoveLeft && (
            <button
              onClick={onMoveLeft}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title="Move Chat Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 truncate">
            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3" />
            </div>
            <span>My Tutor AI</span>
          </div>

          {canMoveRight && (
            <button
              onClick={onMoveRight}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title="Move Chat Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Depth & Mode Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          {/* Answer Depth Dropdown Selector */}
          <div className="relative shrink-0">
            <select
              value={answerDepth}
              onChange={(e) => onChangeAnswerDepth(e.target.value as AnswerDepthMode)}
              className="appearance-none bg-white border border-slate-200 text-slate-800 text-[11px] font-semibold rounded-lg pl-2 pr-6 py-1 shadow-2xs hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-colors"
              title="Select Answer Depth (Quick, Medium, Detailed)"
            >
              <option value="quick">⚡ Quick (Short &amp; Easy)</option>
              <option value="medium">⚖️ Medium (Balanced)</option>
              <option value="detailed">📚 Detailed (Deep Proof)</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Explain / Quiz Mode Switcher */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0">
            {(['explain', 'quiz'] as TutorMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  onChangeMode(m);
                  if (m === 'quiz' && messages.length > 0) {
                    onSendMessage('Generate a quiz to test my understanding of what I have watched so far', 'quiz');
                  }
                }}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  currentMode === m ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                }`}
                title={m === 'quiz' ? 'Test what you have watched so far' : 'Detailed visual and conceptual explanations'}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions & Window Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          {onClearChat && (
            <button
              onClick={onClearChat}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              title="Clear Chat Conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onToggleMaximize}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors"
            title={isMaximized ? "Restore" : "Maximize Chat"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onToggleMinimize}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors"
            title="Minimize Chat"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Thread Scroll Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-3 relative min-h-0 select-text"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="font-semibold text-xs text-slate-700">Pause anywhere in the lecture to ask.</p>
            <p className="text-[11px] text-slate-400 max-w-[240px]">
              My Tutor reads live blackboard formulas directly from the video screen on the fly — zero preclassified notes.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[92%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs select-text ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-slate-50 text-slate-900 border border-slate-200 rounded-bl-xs'
                }`}
              >
                {/* Header metadata */}
                <div className="flex items-center justify-between gap-2 mb-1 opacity-75 text-[10px]">
                  <span>
                    {msg.role === 'user' ? 'You' : 'My Tutor'} · {formatTimestamp(msg.timestamp)}
                  </span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => speakText(msg.id, msg.content)}
                      className="hover:text-blue-600 transition-colors"
                      title="Read Aloud"
                    >
                      {isSpeaking === msg.id ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* Body Content with KaTeX */}
                <MathText 
                  content={msg.content} 
                  className={msg.role === 'user' ? 'text-white' : 'text-slate-900'} 
                />

                {/* Inline Vector SVG Diagram Card if present */}
                {msg.diagram?.svgMarkup && (
                  <div className="mt-3 p-2.5 bg-slate-900 text-white rounded-xl border border-slate-700 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-blue-400">
                      <span className="truncate max-w-[200px]">{msg.diagram.title || 'Visual Model'}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-200 uppercase font-mono">
                        Diagram
                      </span>
                    </div>
                    <div 
                      className="w-full h-44 flex items-center justify-center rounded-lg overflow-hidden bg-slate-950"
                      dangerouslySetInnerHTML={{ __html: msg.diagram.svgMarkup }}
                    />
                    {msg.diagram.caption && (
                      <p className="text-[10px] text-slate-400 italic pt-0.5">
                        {msg.diagram.caption}
                      </p>
                    )}
                  </div>
                )}

                {/* Inline Quiz Card if present */}
                {msg.quiz && (
                  <div className="mt-3 p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-2xs space-y-2">
                    <div className="flex items-center gap-1 font-semibold text-[11px] text-blue-700">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Check Your Understanding</span>
                    </div>
                    <p className="text-xs font-medium">{msg.quiz.question}</p>
                    <div className="space-y-1 pt-1">
                      {msg.quiz.options?.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => {
                            if (oIdx === msg.quiz?.correctAnswerIndex) {
                              confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
                              alert('✨ Correct! ' + msg.quiz?.explanation);
                            } else {
                              alert('Not quite. ' + msg.quiz?.explanation);
                            }
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-[11px] transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Follow-up Prompt Chips */}
                {msg.role === 'assistant' && msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                    {msg.suggestedPrompts.map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => onSendMessage(prompt, currentMode, attachedImage)}
                        disabled={isLoading}
                        className="text-left px-2.5 py-1 rounded-lg bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 text-blue-700 text-[10px] font-medium transition-colors flex items-center gap-1.5 group cursor-pointer shadow-2xs"
                        title="Click to ask this follow-up"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 animate-pulse w-max">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>My Tutor is inspecting the live screen &amp; handwriting...</span>
          </div>
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBtn && (
        <button
          onClick={jumpToBottom}
          className="absolute bottom-20 right-6 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 text-xs font-semibold cursor-pointer animate-in fade-in transition-all"
          title="Jump to latest message"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Jump to Latest</span>
        </button>
      )}

      {/* Bottom Chat Input Form */}
      <div className="p-2.5 border-t border-slate-200 bg-white shrink-0">
        {/* Attached Screenshot Preview Badge */}
        {attachedImage && (
          <div className="flex items-center gap-2 mb-2 p-1.5 px-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 shadow-2xs animate-in fade-in">
            <img src={attachedImage} alt="Screen capture" className="w-9 h-9 rounded-lg object-cover border border-blue-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold block truncate">📸 Live Screenshot Attached</span>
              <span className="text-[10px] text-blue-600">AI will read this blackboard screen directly</span>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Remove attached screenshot"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="relative flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all shadow-2xs">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder={attachedImage ? "Ask about this screenshot (or press Enter to analyze)..." : "Ask about this lecture... (Ctrl+V to paste screenshot)"}
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="flex-1 bg-transparent px-2 py-1 text-xs outline-none resize-none max-h-24 text-slate-900 placeholder:text-slate-400"
          />

          {/* Live Screen Grabber Button */}
          <button
            onClick={handleCaptureScreen}
            disabled={isCapturingScreen || isLoading}
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              attachedImage ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200/60'
            }`}
            title="📸 Capture Live Video Screen / Tab"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Attach Screenshot File Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
            title="Attach screenshot image file"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Speech Mic */}
          <button
            onClick={toggleRecording}
            className={`p-1.5 rounded-xl transition-colors ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
            }`}
            title="Speak Question"
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={(!inputText.trim() && !attachedImage) || isLoading}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            title="Send (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
