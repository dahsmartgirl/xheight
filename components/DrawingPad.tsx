import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stroke, Point } from '../types';
import { Trash2, Undo, Redo, Grid3x3 } from 'lucide-react';

interface DrawingPadProps {
  char: string;
  onSave: (strokes: Stroke[], width: number, height: number) => void;
  existingStrokes?: Stroke[];
}

const DrawingPad: React.FC<DrawingPadProps> = ({ char, onSave, existingStrokes }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>(existingStrokes || []);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [showGuides, setShowGuides] = useState(true);

  // Sync with prop changes (navigation)
  useEffect(() => {
    setStrokes(existingStrokes || []);
    setRedoStack([]); // Clear redo on char change
  }, [existingStrokes, char]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showGuides) {
      const w = canvas.width;
      const h = canvas.height;
      // Simple crosshair
      ctx.beginPath();
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    }

    // Styles for Ink
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawPoints = (points: Point[], context: CanvasRenderingContext2D) => {
        if (points.length === 0) return;
        
        context.beginPath();
        if (points.length === 1) {
            context.arc(points[0].x, points[0].y, 3, 0, Math.PI * 2);
            context.fill();
        } else {
            context.moveTo(points[0].x, points[0].y);
            points.forEach(p => context.lineTo(p.x, p.y));
            context.stroke();
        }
    };

    // --- Active Ink Layer ---
    ctx.lineWidth = 6; 
    ctx.strokeStyle = '#171717'; // Neutral 900
    ctx.fillStyle = '#171717';

    // Existing Strokes
    strokes.forEach(stroke => drawPoints(stroke.points, ctx));

    // Current Stroke
    drawPoints(currentStroke, ctx);

  }, [strokes, currentStroke, showGuides]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            // Set canvas resolution to match display size
            canvasRef.current.width = containerRef.current.offsetWidth;
            canvasRef.current.height = containerRef.current.offsetHeight;
            draw();
        }
    }
    window.addEventListener('resize', handleResize);
    // Initial resize
    setTimeout(handleResize, 10); 
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    setCurrentStroke([pos]);
    if (redoStack.length > 0) setRedoStack([]);
  };

  const moveDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault(); 
    const pos = getPos(e);
    setCurrentStroke(prev => [...prev, pos]);
  };

  const saveState = (newStrokes: Stroke[]) => {
      setStrokes(newStrokes);
      if (canvasRef.current) {
          onSave(newStrokes, canvasRef.current.width, canvasRef.current.height);
      }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (currentStroke.length > 0) {
      const newStrokes = [...strokes, { points: currentStroke }];
      saveState(newStrokes);
    }
    setCurrentStroke([]);
  };

  const handleUndo = () => {
      if (strokes.length === 0) return;
      const newStrokes = [...strokes];
      const popped = newStrokes.pop();
      if (popped) {
          setRedoStack(prev => [...prev, [popped]]);
          saveState(newStrokes);
      }
  };

  const handleRedo = () => {
      if (redoStack.length === 0) return;
      const newRedoStack = [...redoStack];
      const strokesToRestore = newRedoStack.pop();
      if (strokesToRestore) {
          const newStrokes = [...strokes, ...strokesToRestore];
          setRedoStack(newRedoStack);
          saveState(newStrokes);
      }
  };

  const clearCanvas = () => {
      if (strokes.length > 0) {
        // Optional: save to history if implementing clear undo
      }
      saveState([]);
      setRedoStack([]);
  };

  return (
    <div className="w-full h-full relative flex flex-col">
      
      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="relative flex-1 w-full bg-[#FAFAFA] rounded-[20px] overflow-hidden cursor-crosshair touch-none border border-transparent"
      >
        {/* Background Grid Pattern (Subtle) */}
        {showGuides && <div className="absolute inset-0 bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>}

        {/* Faint Background Char - Scaled: 250px -> 160px */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
             <span 
               className="font-['Inter'] font-normal text-[#F2F2F2] text-[120px] lg:text-[160px]" 
               style={{ lineHeight: '1' }}
             >
                {char}
             </span>
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={moveDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={moveDrawing}
          onTouchEnd={stopDrawing}
          className="relative z-10 w-full h-full block"
        />

        {/* Draw "C" Pill - Scaled Position and Font */}
        <div className="absolute top-[12px] left-[16px] z-20 bg-white rounded-[26px] px-[14px] py-[6px] flex items-center gap-[4px] shadow-sm">
            <span className="text-[12px] lg:text-[13px] font-['Inter'] font-medium text-black">Draw</span>
            <span className="text-[12px] lg:text-[13px] font-['Inter'] font-medium text-[#ED0C14]">“{char}”</span>
        </div>

        {/* Floating Toolbar Pill - Scaled Position and Height */}
        <div className="absolute top-[12px] right-[16px] z-20 bg-white rounded-[26px] h-[32px] px-3 lg:px-4 flex items-center gap-3 lg:gap-4 shadow-sm">
           <button 
             onClick={handleUndo} 
             disabled={strokes.length === 0}
             className="text-gray-400 hover:text-black transition-colors disabled:opacity-30"
           >
             <Undo size={16} strokeWidth={2} />
           </button>
           
           <button 
             onClick={handleRedo} 
             disabled={redoStack.length === 0}
             className="text-gray-400 hover:text-black transition-colors disabled:opacity-30"
           >
             <Redo size={16} strokeWidth={2} />
           </button>

           <div className="w-[1px] h-[14px] bg-[#D9D9D9]"></div>

           <button 
             onClick={clearCanvas} 
             disabled={strokes.length === 0}
             className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
           >
             <Trash2 size={16} strokeWidth={2} />
           </button>
           
           <button 
             onClick={() => setShowGuides(!showGuides)} 
             className={`${showGuides ? 'text-black' : 'text-gray-400'} hover:text-black transition-colors`}
           >
             <Grid3x3 size={16} strokeWidth={2} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default DrawingPad;