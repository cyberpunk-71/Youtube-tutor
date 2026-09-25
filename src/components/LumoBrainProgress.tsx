import React from 'react';
import { X, Brain, CheckCircle, AlertCircle, RefreshCw, Zap, TrendingUp, BookOpen } from 'lucide-react';
import type { StudentMasteryItem } from '../types/tutor';

interface LumoBrainProgressProps {
  isOpen: boolean;
  onClose: () => void;
  masteryItems: StudentMasteryItem[];
  onPracticeTopic: (topic: string) => void;
}

export const LumoBrainProgress: React.FC<LumoBrainProgressProps> = ({
  isOpen,
  onClose,
  masteryItems,
  onPracticeTopic
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-line shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-paper-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-accent text-white flex items-center justify-center font-bold shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink font-sans flex items-center gap-2">
                <span>My Tutor Brain</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  Active Learning Memory
                </span>
              </h2>
              <p className="text-xs text-muted">
                Tracks what you've mastered, what's fading, and mistakes you keep making across lectures.
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-[#fbfaf7]">
          {/* Summary Banner */}
          <div className="p-4 rounded-2xl bg-white border border-line shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pen/10 text-pen flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-ink uppercase tracking-wider">Semester Mastery</p>
                <p className="text-sm font-medium text-muted">67% average retention rate</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                +14% this week
              </span>
            </div>
          </div>

          {/* Mastery Items Progress List */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
              Tracked Subject Concepts
            </h3>

            {masteryItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-line shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink text-sm">{item.topic}</span>
                    <span className="text-[11px] text-muted font-mono">({item.subject})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                      item.status === 'mastered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'developing'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                    <span className="font-mono font-semibold text-ink">{item.percentage}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.status === 'mastered'
                        ? 'bg-emerald-600'
                        : item.status === 'developing'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                {/* Cognitive Note & Action Button */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  {item.note ? (
                    <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md text-[11px] border border-amber-200">
                      ⚠️ {item.note}
                    </span>
                  ) : (
                    <span className="text-muted text-[11px]">Reviewed 2 days ago</span>
                  )}

                  <button
                    onClick={() => {
                      onPracticeTopic(item.topic);
                      onClose();
                    }}
                    className="flex items-center gap-1 text-pen hover:underline font-semibold text-xs ml-auto"
                  >
                    <Zap className="w-3 h-3 text-accent" />
                    <span>Practice Concept</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
