import React, { useState } from 'react';
import { X, Camera, Sparkles, Copy, Check, ArrowRight, Eye, Code2 } from 'lucide-react';
import type { BlackboardAnalysis, BlackboardBoundingBox } from '../types/tutor';
import { MathText } from '../utils/katexRenderer';

interface BlackboardInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: BlackboardAnalysis | null;
  frameUrl?: string;
  onAskAboutBox: (box: BlackboardBoundingBox) => void;
  isLoading: boolean;
  timestamp: number;
}

export const BlackboardInspector: React.FC<BlackboardInspectorProps> = ({
  isOpen,
  onClose,
  analysis,
  frameUrl,
  onAskAboutBox,
  isLoading,
  timestamp
}) => {
  const [selectedBox, setSelectedBox] = useState<BlackboardBoundingBox | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyLatex = (latex: string, id: string) => {
    navigator.clipboard.writeText(latex);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-line shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-paper-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-bold shadow-2xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">
                Blackboard & Handwritten OCR Inspector
              </h2>
              <p className="text-xs text-muted">
                Frame captured @ <span className="font-mono text-pen font-semibold">{formatTime(timestamp)}</span>
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#fbfaf7]">
          {/* Left / Top: Captured Blackboard Frame with Interactive Bounding Boxes */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="relative w-full aspect-video bg-board rounded-2xl overflow-hidden border border-[#2d3f35] shadow-chalkboard">
              {/* Frame image or chalkboard background */}
              {frameUrl ? (
                <img
                  src={frameUrl}
                  alt="Blackboard Snapshot"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full chalkboard-bg flex items-center justify-center text-chalk/40 font-hand text-xl">
                  Chalkboard Snapshot @ {formatTime(timestamp)}
                </div>
              )}

              {/* Bounding Box Overlays */}
              {analysis?.boundingBoxes?.map((box) => {
                const isSelected = selectedBox?.id === box.id;
                return (
                  <button
                    key={box.id}
                    onClick={() => setSelectedBox(box)}
                    className={`absolute rounded-lg border-2 transition-all cursor-pointer group flex items-start justify-end p-1 ${
                      isSelected
                        ? 'border-accent bg-accent/20 shadow-lg ring-2 ring-accent/30'
                        : 'border-chalk-yellow/80 hover:border-chalk-yellow bg-chalk-yellow/10 hover:bg-chalk-yellow/20'
                    }`}
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`
                    }}
                    title={box.label}
                  >
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-white font-medium opacity-90 group-hover:opacity-100">
                      {box.label}
                    </span>
                  </button>
                );
              })}

              {isLoading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white text-xs font-medium gap-2">
                  <span className="animate-spin text-base">⏳</span>
                  <span>Gemini Vision reading handwritten chalk formulas...</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted text-center italic">
              💡 Click any highlighted yellow box on the blackboard to inspect formulas and ask My Tutor.
            </p>
          </div>

          {/* Right: OCR Breakdown & Selected Equation Details */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Selected Element Focus Box */}
            {selectedBox ? (
              <div className="bg-white p-4 rounded-2xl border-2 border-accent/40 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Selected: {selectedBox.label}
                  </span>
                  {selectedBox.latex && (
                    <button
                      onClick={() => handleCopyLatex(selectedBox.latex!, selectedBox.id)}
                      className="text-xs flex items-center gap-1 text-muted hover:text-ink px-2 py-0.5 rounded border border-line bg-paper"
                    >
                      {copiedId === selectedBox.id ? (
                        <>
                          <Check className="w-3 h-3 text-green-600" />
                          <span className="text-green-600 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy LaTeX</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {selectedBox.latex && (
                  <div className="p-3 bg-paper-card rounded-xl border border-line text-center">
                    <MathText content={`$$${selectedBox.latex}$$`} />
                  </div>
                )}

                <p className="text-xs text-ink/80 leading-relaxed">
                  {selectedBox.content}
                </p>

                <button
                  onClick={() => {
                    onAskAboutBox(selectedBox);
                    onClose();
                  }}
                  className="w-full py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask My Tutor about this equation</span>
                </button>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-2xl border border-line text-xs text-muted text-center py-6">
                Click an equation or diagram box on the board to view its mathematical derivation.
              </div>
            )}

            {/* Extracted Equations List */}
            <div className="bg-white p-4 rounded-2xl border border-line shadow-xs space-y-3 flex-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-pen" />
                <span>Detected Blackboard Equations ({analysis?.equations?.length || 0})</span>
              </h3>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {analysis?.equations && analysis.equations.length > 0 ? (
                  analysis.equations.map((eq, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-paper border border-line hover:border-accent/30 transition-colors space-y-1"
                    >
                      <div className="text-xs text-center font-medium">
                        <MathText content={`$$${eq.latex}$$`} />
                      </div>
                      <p className="text-[11px] text-muted text-center">
                        {eq.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted text-center py-4">
                    No blackboard formulas detected at this frame.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
