import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  HelpCircle, CheckCircle2, XCircle, ArrowRight,
  MessageSquare, Lightbulb, ChevronLeft, ChevronRight, Minus, Maximize2, Minimize2, ArrowDown, ChevronDown, Trash2
} from 'lucide-react';
import type { TutorMessage, TutorMode, QuizQuestion, AnswerDepthMode } from '../types/tutor';
import { MathText } from '../utils/katexRenderer';
import confetti from 'canvas-confetti';

interface TutorChatProps {
  messages: TutorMessage[];
  onSendMessage: (text: string, mode: TutorMode) => void;
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
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Track scroll position to display floating Scroll-to-Bottom button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isUp);
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
          onSendMessage(transcript, currentMode);
        }
        setIsRecording(false);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, [currentMode, onSendMessage]);

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
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText.trim(), currentMode);
      setInputText('');
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
    <div className="flex flex-col h-full w-full rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden select-none">
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

          {/* Socratic / Explain / Quiz Mode Buttons */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0">
            {(['socratic', 'explain', 'quiz'] as TutorMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onChangeMode(m)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  currentMode === m ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                }`}
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
        className="flex-1 overflow-y-auto p-3 space-y-3 relative"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="font-semibold text-xs text-slate-700">Pause anywhere in the lecture and ask.</p>
            <p className="text-[11px] text-slate-400 max-w-[220px]">
              My Tutor analyzes that exact moment and draws step-by-step on your whiteboard.
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
                className={`max-w-[92%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
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
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 animate-pulse w-max">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>My Tutor is analyzing lecture context &amp; drawing on whiteboard...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 z-30 p-2 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all animate-in fade-in"
          title="Scroll to latest message"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bottom Chat Input Form */}
      <div className="p-2.5 border-t border-slate-200 bg-white shrink-0">
        <div className="relative flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all shadow-2xs">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="Ask about this moment in the lecture..."
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent px-2 py-1 text-xs outline-none resize-none max-h-24 text-slate-900 placeholder:text-slate-400"
          />

          <button
            onClick={toggleRecording}
            className={`p-1.5 rounded-xl transition-colors ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
            }`}
            title="Speak Question"
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-all shadow-xs shrink-0"
            title="Send (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
