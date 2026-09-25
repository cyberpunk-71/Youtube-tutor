import React, { useState } from 'react';
import { 
  Play, Video, Compass, LayoutGrid, Maximize, Columns3, 
  PanelLeft, MessageSquare, Clock, Trash2, CheckCircle2, Bookmark, Sparkles
} from 'lucide-react';
import type { VideoMetadata, RecentVideoItem } from '../types/tutor';

export type StudioLayoutPreset = 'studio' | 'canvas_focus' | 'cinema_focus' | 'chat_focus';

interface NavbarProps {
  currentVideo: VideoMetadata | null;
  currentTime: number;
  onLoadUrl: (url: string) => void;
  onSelectPreset: (video: VideoMetadata) => void;
  presets: VideoMetadata[];
  recentVideos: RecentVideoItem[];
  onSelectRecentVideo: (item: RecentVideoItem) => void;
  onClearRecentVideos: () => void;
  isLoading: boolean;
  activeLayout: StudioLayoutPreset;
  onSelectLayout: (preset: StudioLayoutPreset) => void;
  onResetLayout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentVideo,
  currentTime,
  onLoadUrl,
  onSelectPreset,
  presets,
  recentVideos,
  onSelectRecentVideo,
  onClearRecentVideos,
  isLoading,
  activeLayout,
  onSelectLayout,
  onResetLayout
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(false);
  const [quickLinksTab, setQuickLinksTab] = useState<'recent' | 'curated'>('recent');
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onLoadUrl(urlInput.trim());
      setUrlInput('');
    }
  };

  const layoutOptions: { id: StudioLayoutPreset; label: string; icon: any; desc: string }[] = [
    { id: 'studio', label: 'Studio View', icon: Columns3, desc: 'Balanced 3-Column (34% | 41% | 25%)' },
    { id: 'canvas_focus', label: 'Whiteboard Focus', icon: Maximize, desc: 'Expanded Canvas (60% Center)' },
    { id: 'cinema_focus', label: 'Cinema Video', icon: PanelLeft, desc: 'Large Video Left (55%)' },
    { id: 'chat_focus', label: 'Tutor Chat Focus', icon: MessageSquare, desc: 'Expanded AI Discussion (45%)' }
  ];

  const formatTimestamp = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <header className="h-[52px] border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 flex items-center justify-between gap-3 shrink-0 z-40 shadow-2xs">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-serif font-bold text-sm shadow-xs">
              M
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-slate-900 font-sans">
                My Tutor
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Studio
              </span>
            </div>
          </div>

          {currentVideo && (
            <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500">
              <span className="max-w-[200px] truncate font-medium text-slate-800" title={currentVideo.title}>
                {currentVideo.title}
              </span>
              <span>· {currentVideo.channel}</span>
            </div>
          )}
        </div>

        {/* Center: Quick YouTube URL Ingestion Form & Quick Links Dropdown */}
        <div className="flex items-center gap-2 flex-1 max-w-lg min-w-[260px]">
          <form onSubmit={handleSubmit} className="relative flex-1">
            <input
              type="text"
              placeholder="Paste any YouTube lecture URL (3Blue1Brown, MIT, Khan, CS50)..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full pl-8 pr-20 py-1.5 text-xs bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-full outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-slate-900 placeholder:text-slate-400"
            />
            <Video className="w-3.5 h-3.5 text-red-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            
            <button
              type="submit"
              disabled={isLoading || !urlInput.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-full text-[11px] font-medium transition-all shadow-xs flex items-center gap-1"
            >
              {isLoading ? (
                <span className="animate-spin text-[10px]">⏳</span>
              ) : (
                <>
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>Load</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Links (Previous 5 Videos & Presets) Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsQuickLinksOpen(!isQuickLinksOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs"
              title="Recent Videos & Quick Links"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Quick Links</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold">
                {recentVideos.length > 0 ? recentVideos.length : presets.length}
              </span>
            </button>

            {isQuickLinksOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsQuickLinksOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl border border-slate-200 shadow-xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2">
                  {/* Tab Header Switcher */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px]">
                      <button
                        onClick={() => setQuickLinksTab('recent')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          quickLinksTab === 'recent'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Recent ({recentVideos.length})
                      </button>
                      <button
                        onClick={() => setQuickLinksTab('curated')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          quickLinksTab === 'curated'
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Curated ({presets.length})
                      </button>
                    </div>

                    {quickLinksTab === 'recent' && recentVideos.length > 0 && (
                      <button
                        onClick={onClearRecentVideos}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Clear recent history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* List Container */}
                  <div className="py-0.5 space-y-1.5 max-h-80 overflow-y-auto">
                    {quickLinksTab === 'recent' ? (
                      recentVideos.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          No recent videos yet. Paste any YouTube URL above!
                        </div>
                      ) : (
                        recentVideos.map((item, idx) => {
                          const isCurrent = currentVideo?.id === item.id;
                          const progressPct = item.duration > 0 ? Math.min(100, Math.round((item.lastTimestamp / item.duration) * 100)) : 0;

                          return (
                            <button
                              key={item.id || idx}
                              onClick={() => {
                                onSelectRecentVideo(item);
                                setIsQuickLinksOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                                isCurrent 
                                  ? 'bg-blue-50/80 border border-blue-200 text-blue-900 shadow-2xs' 
                                  : 'hover:bg-slate-50 border border-transparent text-slate-700'
                              }`}
                            >
                              {/* Thumbnail */}
                              <div className="relative w-12 h-9 rounded-lg bg-slate-900 shrink-0 overflow-hidden mt-0.5">
                                <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-90" />
                                <div className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/80 rounded text-[9px] font-mono text-white">
                                  {formatTimestamp(item.lastTimestamp > 0 ? item.lastTimestamp : item.duration)}
                                </div>
                              </div>

                              {/* Title & Info */}
                              <div className="flex-1 min-w-0">
                                <div className="truncate font-semibold text-slate-900 flex items-center justify-between gap-1">
                                  <span className="truncate">{item.title}</span>
                                  {isCurrent && (
                                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                                  <span>{item.channel}</span>
                                  <span>•</span>
                                  <span className="text-blue-600 font-medium">
                                    {item.lastTimestamp > 5 ? `Resume at ${formatTimestamp(item.lastTimestamp)}` : 'Start from beginning'}
                                  </span>
                                </div>

                                {/* Mini Progress Bar */}
                                {item.lastTimestamp > 0 && item.duration > 0 && (
                                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1.5">
                                    <div 
                                      className="bg-blue-600 h-full rounded-full transition-all"
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )
                    ) : (
                      presets.map((p) => {
                        const isCurrent = currentVideo?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              onSelectPreset(p);
                              setIsQuickLinksOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                              isCurrent 
                                ? 'bg-blue-50/80 border border-blue-200 text-blue-900 shadow-2xs' 
                                : 'hover:bg-slate-50 border border-transparent text-slate-700'
                            }`}
                          >
                            <div className="w-12 h-9 rounded-lg bg-slate-900 shrink-0 overflow-hidden mt-0.5">
                              <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-semibold text-slate-900">{p.title}</div>
                              <div className="text-[11px] text-slate-400">{p.channel}</div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Studio Layout Presets Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative">
            <button
              onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-200 bg-blue-50 hover:bg-blue-100/70 text-blue-700 transition-colors shadow-2xs"
              title="Change Studio Layout"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline font-semibold capitalize">
                {activeLayout.replace('_', ' ')}
              </span>
            </button>

            {isLayoutMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsLayoutMenuOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Studio Layout Presets
                  </div>
                  <div className="py-1 space-y-1">
                    {layoutOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = activeLayout === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            onSelectLayout(opt.id);
                            setIsLayoutMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-3 transition-colors ${
                            isActive ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                          <div>
                            <div>{opt.label}</div>
                            <div className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                              {opt.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-2 mt-1 border-t border-slate-100 px-1">
                    <button
                      onClick={() => {
                        onResetLayout();
                        setIsLayoutMenuOpen(false);
                      }}
                      className="w-full text-center py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Reset Panels to Default
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
