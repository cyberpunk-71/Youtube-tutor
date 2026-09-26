import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PenTool, Eraser, RotateCcw, Download, Sparkles, Check, 
  Palette, ZoomIn, ZoomOut, Maximize2, Minimize2, Move,
  StickyNote, X, ChevronLeft, ChevronRight, Minus, CornerRightDown
} from 'lucide-react';
import type { InteractiveDiagram, CanvasNode } from '../types/tutor';
import { MathText } from '../utils/katexRenderer';

interface WhiteboardCanvasProps {
  currentDiagram: InteractiveDiagram | null;
  onCloseDiagram?: () => void;
  canvasNodes: CanvasNode[];
  onAddCanvasNode: (node: CanvasNode) => void;
  onDeleteCanvasNode: (id: string) => void;
  onUpdateCanvasNodePos: (id: string, x: number, y: number) => void;
  onAskCanvasQuestion: (question: string, canvasBase64?: string, coords?: { x: number; y: number; width?: number; height?: number }) => void;
  isCheckingDrawing: boolean;
  activeTopic?: string;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  currentTime: number;
}

type DrawTool = 'pen' | 'marker' | 'eraser' | 'sticky' | 'pan';

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  currentDiagram,
  onCloseDiagram,
  canvasNodes,
  onAddCanvasNode,
  onDeleteCanvasNode,
  onUpdateCanvasNodePos,
  onAskCanvasQuestion,
  isCheckingDrawing,
  activeTopic,
  isMaximized,
  onToggleMaximize,
  isMinimized,
  onToggleMinimize,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  currentTime
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Tools & Styling
  const [activeTool, setActiveTool] = useState<DrawTool>('pen');
  const [strokeColor, setStrokeColor] = useState('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  // Infinite Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Drawing Tracking
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeBounds, setStrokeBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  
  // Quick Prompt Popup on Canvas
  const [quickQuestion, setQuickQuestion] = useState('');

  // Dragging Canvas Nodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Convert screen client coordinates to Zoomed/Panned Canvas coordinates
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  }, [pan, zoom]);

  // Handle Zoom
  const handleZoom = (delta: number) => {
    setZoom(prevZoom => {
      const newZoom = Math.min(2.5, Math.max(0.4, Number((prevZoom + delta).toFixed(2))));
      return newZoom;
    });
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Wheel Zoom & Pan handler
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      handleZoom(delta);
    } else if (activeTool === 'pan') {
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  // Drawing Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || activeTool === 'pan' || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (activeTool === 'sticky') {
      const newNode: CanvasNode = {
        id: `sticky-${Date.now()}`,
        type: 'sticky_note',
        x: coords.x,
        y: coords.y,
        title: 'Note / Question',
        content: 'Type your question or derivation note here...',
        color: '#fef08a',
        createdAt: Date.now()
      };
      onAddCanvasNode(newNode);
      setActiveTool('pen');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasDrawn(true);

    setStrokeBounds(prev => {
      if (!prev) {
        return { minX: coords.x, minY: coords.y, maxX: coords.x, maxY: coords.y };
      }
      return {
        minX: Math.min(prev.minX, coords.x),
        minY: Math.min(prev.minY, coords.y),
        maxX: Math.max(prev.maxX, coords.x),
        maxY: Math.max(prev.maxY, coords.y)
      };
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (draggingNodeId) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      onUpdateCanvasNodePos(draggingNodeId, coords.x - dragOffset.x, coords.y - dragOffset.y);
      return;
    }

    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 8;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = activeTool === 'marker' ? strokeWidth * 3 : strokeWidth;
      ctx.strokeStyle = activeTool === 'marker' ? `${strokeColor}66` : strokeColor;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }

    setStrokeBounds(prev => {
      if (!prev) return { minX: coords.x, minY: coords.y, maxX: coords.x, maxY: coords.y };
      return {
        minX: Math.min(prev.minX, coords.x),
        minY: Math.min(prev.minY, coords.y),
        maxX: Math.max(prev.maxX, coords.x),
        maxY: Math.max(prev.maxY, coords.y)
      };
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setStrokeBounds(null);
    if (onCloseDiagram) {
      onCloseDiagram();
    }
  };

  const handleAskAboutDrawing = (customText?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const base64 = canvas.toDataURL('image/png');
    const questionText = customText || quickQuestion || 'Explain this concept and check whether my sketch is correct.';
    
    let centerCoords = { x: 350, y: 200, width: 80, height: 60 };
    if (strokeBounds) {
      centerCoords = {
        x: (strokeBounds.minX + strokeBounds.maxX) / 2,
        y: (strokeBounds.minY + strokeBounds.maxY) / 2,
        width: Math.max(60, strokeBounds.maxX - strokeBounds.minX),
        height: Math.max(40, strokeBounds.maxY - strokeBounds.minY)
      };
    }

    onAskCanvasQuestion(questionText, base64, centerCoords);
    setQuickQuestion('');
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `mytutor-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const curatedColors = [
    '#0f172a', // Charcoal
    '#2563eb', // Blue
    '#ea580c', // Coral
    '#16a34a', // Emerald
    '#7c3aed', // Purple
    '#db2777'  // Rose
  ];

  // Minimized Slim Dock View
  if (isMinimized) {
    return (
      <div className="h-full w-full flex items-center justify-center p-2 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={onToggleMinimize}
          className="flex flex-col items-center gap-3 py-6 px-2 rounded-xl hover:bg-slate-50 transition-all text-slate-800 group"
          title="Expand Shared Whiteboard"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="[writing-mode:vertical-rl] font-semibold text-xs tracking-wider text-slate-700 flex items-center gap-2">
            <span>WHITEBOARD</span>
            {canvasNodes.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] [writing-mode:horizontal-tb]">
                {canvasNodes.length}
              </span>
            )}
          </div>
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden select-none">
      {/* Top Panel Header */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm flex flex-wrap items-center justify-between gap-2 z-30 shrink-0">
        {/* Left: Reorder buttons & Title */}
        <div className="flex items-center gap-1.5">
          {canMoveLeft && (
            <button
              onClick={onMoveLeft}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title="Move Whiteboard Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3" />
            </div>
            <span>Whiteboard Canvas</span>
            {activeTopic && (
              <span className="text-[11px] text-slate-400 font-normal hidden xl:inline truncate max-w-[130px]">
                · {activeTopic}
              </span>
            )}
          </div>

          {canMoveRight && (
            <button
              onClick={onMoveRight}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title="Move Whiteboard Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: In-Canvas Drawing Tools */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <button
              onClick={() => setActiveTool('pen')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                activeTool === 'pen' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Pen Tool"
            >
              <PenTool className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('marker')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                activeTool === 'marker' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Highlighter"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('sticky')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                activeTool === 'sticky' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Add Sticky Note"
            >
              <StickyNote className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                activeTool === 'eraser' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('pan')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                activeTool === 'pan' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Hand Tool (Pan Canvas)"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color Palette */}
          <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-200">
            {curatedColors.map(c => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                className={`w-3.5 h-3.5 rounded-full transition-transform ${
                  strokeColor === c ? 'scale-125 ring-2 ring-blue-500' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Clear & Export */}
          <div className="flex items-center gap-0.5 pl-1 border-l border-slate-200">
            <button
              onClick={clearCanvas}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              title="Clear Canvas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={exportCanvas}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              title="Download Canvas PNG"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Window Controls (Minimize, Maximize) */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onToggleMaximize}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors"
            title={isMaximized ? "Restore" : "Maximize Whiteboard"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onToggleMinimize}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors"
            title="Minimize Whiteboard"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Zoomable Canvas Area */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`relative flex-1 w-full overflow-hidden bg-slate-50 cursor-${
          activeTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : activeTool === 'sticky' ? 'copy' : 'crosshair'
        }`}
        style={{
          backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
      >
        {/* Zoomed & Panned Spatial Container */}
        <div 
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: '3200px',
            height: '2000px'
          }}
        >
          {/* Layer 1: Vector SVG Lecture Diagram */}
          {currentDiagram?.svgMarkup && (
            <div 
              className="absolute top-10 left-10 w-[520px] h-[340px] bg-white rounded-2xl border border-slate-200 shadow-md p-4 pointer-events-auto"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-semibold text-slate-800">
                <span className="truncate max-w-[340px]">{currentDiagram.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-mono">
                    Visual Diagram
                  </span>
                  {onCloseDiagram && (
                    <button
                      onClick={onCloseDiagram}
                      className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Dismiss diagram (x)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div 
                className="w-full h-[250px] flex items-center justify-center rounded-xl overflow-hidden"
                dangerouslySetInnerHTML={{ __html: currentDiagram.svgMarkup }}
              />
            </div>
          )}

          {/* Layer 2: Freehand Drawing Canvas */}
          <canvas
            ref={canvasRef}
            width={3200}
            height={2000}
            className="absolute inset-0 w-full h-full pointer-events-auto bg-transparent"
          />

          {/* Layer 3: Dynamic Spatial AI Response Nodes & Sticky Notes */}
          {canvasNodes.map((node) => (
            <div
              key={node.id}
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              className={`absolute w-[360px] rounded-2xl border shadow-lg backdrop-blur-md pointer-events-auto transition-shadow ${
                node.type === 'sticky_note'
                  ? 'bg-amber-50/95 border-amber-200 text-amber-950'
                  : 'bg-white/95 border-blue-200/80 text-slate-900 ring-1 ring-blue-500/10'
              }`}
            >
              {/* Node Drag Handle Header */}
              <div 
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggingNodeId(node.id);
                  const coords = getCanvasCoords(e.clientX, e.clientY);
                  setDragOffset({ x: coords.x - node.x, y: coords.y - node.y });
                }}
                className="px-3.5 py-2 border-b border-slate-200/60 flex items-center justify-between cursor-move bg-slate-100/50 rounded-t-2xl"
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span className="truncate max-w-[220px]">{node.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCanvasNode(node.id);
                  }}
                  className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  title="Remove card (x)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Node Content Body (KaTeX formatted) */}
              <div className="p-3.5 text-xs max-h-[300px] overflow-y-auto space-y-2">
                <MathText content={node.content} className="text-xs leading-relaxed" />

                {node.diagramSvg && (
                  <div 
                    className="my-2 p-2 bg-slate-50 rounded-xl border border-slate-200"
                    dangerouslySetInnerHTML={{ __html: node.diagramSvg }}
                  />
                )}
              </div>

              {/* Node Connector Pointer Tag */}
              <div className="px-3.5 py-1.5 bg-slate-50/80 rounded-b-2xl border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <CornerRightDown className="w-3 h-3 text-blue-600" />
                  Aligned to {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
                </span>
                <span className="font-mono text-[9px] text-slate-400">Drag handle to move</span>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Quick Action Pill (Appears when user draws) */}
        {hasDrawn && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-2 max-w-lg w-11/12 sm:w-auto animate-in fade-in slide-in-from-bottom-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
            <input
              type="text"
              placeholder="Ask AI about this drawing on the canvas..."
              value={quickQuestion}
              onChange={(e) => setQuickQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAskAboutDrawing();
              }}
              className="px-2 py-1 text-xs outline-none bg-transparent w-44 sm:w-60 text-slate-800 placeholder:text-slate-400"
            />
            <button
              onClick={() => handleAskAboutDrawing()}
              disabled={isCheckingDrawing}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1 transition-all shrink-0"
            >
              {isCheckingDrawing ? (
                <span>Thinking...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Answer on Canvas</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Floating Zoom & Pan Controls in Bottom-Left */}
        <div className="absolute bottom-3 left-3 z-30 bg-white/90 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-200 shadow-md flex items-center gap-1 text-xs font-medium text-slate-700">
          <button
            onClick={() => handleZoom(-0.1)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetView}
            className="px-1.5 py-0.5 rounded-md hover:bg-slate-100 font-mono text-[11px] text-slate-700"
            title="Reset to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => handleZoom(0.1)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
