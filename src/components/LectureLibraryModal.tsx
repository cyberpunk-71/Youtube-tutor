import React, { useState } from 'react';
import { X, BookOpen, Play, Clock, Sparkles, Filter, ChevronRight } from 'lucide-react';
import type { VideoMetadata } from '../types/tutor';

interface LectureLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  library: VideoMetadata[];
  onSelectVideo: (video: VideoMetadata) => void;
  currentVideoId?: string;
}

export const LectureLibraryModal: React.FC<LectureLibraryModalProps> = ({
  isOpen,
  onClose,
  library,
  onSelectVideo,
  currentVideoId
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Subjects' },
    { id: 'numerical', label: 'Numerical Analysis' },
    { id: 'calculus', label: 'Calculus & Math' },
    { id: 'physics', label: 'Physics' },
    { id: 'chemistry', label: 'Chemistry' },
    { id: 'cs', label: 'Computer Science' }
  ];

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  };

  const filtered = library.filter((v) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'numerical') return v.title.toLowerCase().includes('numerical') || v.title.toLowerCase().includes('newton') || v.title.toLowerCase().includes('bisection');
    if (selectedCategory === 'calculus') return v.title.toLowerCase().includes('calculus') || v.title.toLowerCase().includes('linear');
    if (selectedCategory === 'physics') return v.title.toLowerCase().includes('physics') || v.title.toLowerCase().includes('friction');
    if (selectedCategory === 'chemistry') return v.title.toLowerCase().includes('chem') || v.title.toLowerCase().includes('vsepr');
    if (selectedCategory === 'cs') return v.title.toLowerCase().includes('cs50') || v.title.toLowerCase().includes('algorithm');
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl border border-line shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-paper-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-ink text-white flex items-center justify-center font-bold shadow-xs">
              <BookOpen className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink font-sans">
                My Tutor Lecture Library
              </h2>
              <p className="text-xs text-muted">
                Pre-indexed university lectures with full timestamped transcripts & blackboard OCR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="px-6 py-3 border-b border-line/60 flex items-center gap-2 overflow-x-auto bg-[#fbfaf7]">
          <Filter className="w-3.5 h-3.5 text-muted shrink-0 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-ink text-white shadow-xs'
                  : 'bg-white text-muted hover:text-ink border border-line'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Lecture Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-[#fbfaf7]">
          {filtered.map((video) => {
            const isCurrent = video.id === currentVideoId;
            return (
              <div
                key={video.id}
                onClick={() => {
                  onSelectVideo(video);
                  onClose();
                }}
                className={`flex flex-col bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden group hover-lift ${
                  isCurrent
                    ? 'border-accent ring-2 ring-accent/20 shadow-md'
                    : 'border-line hover:border-accent/40 shadow-xs'
                }`}
              >
                {/* Thumbnail Header */}
                <div className="relative w-full aspect-video bg-stone-900 overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60" />
                  
                  {/* Duration Badge */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/80 text-white text-[11px] px-2 py-0.5 rounded-md font-mono font-medium backdrop-blur-xs">
                    <Clock className="w-3 h-3 text-accent" />
                    <span>{formatDuration(video.duration)}</span>
                  </div>

                  {/* Channel Tag */}
                  <div className="absolute top-2.5 left-2.5 bg-white/90 text-ink text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
                    {video.channel}
                  </div>
                </div>

                {/* Info Card */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm text-ink group-hover:text-accent transition-colors line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-xs text-muted mt-1 line-clamp-2">
                      {video.description}
                    </p>
                  </div>

                  {/* Chapters Count & Launch CTA */}
                  <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs">
                    <span className="text-pen font-medium">
                      {video.chapters?.length || 4} Chapters Indexed
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-accent group-hover:translate-x-0.5 transition-transform">
                      <span>{isCurrent ? 'Active Now' : 'Load Video'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
