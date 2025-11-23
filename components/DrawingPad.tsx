import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stroke, Point } from '../types';
import { Trash2, Undo, Grid3x3 } from 'lucide-react';

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
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [showGuides, setShowGuides] = useState(true);

  useEffect(() => {
    setStrokes(existingStrokes || []);
  }, [existingStrokes, char]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (showGuides) {
      // Minimalist Guidelines
      ctx.strokeStyle = '#f5f5f5'; // very light gray
      ctx.lineWidth = 1;
      
      // Crosshair center
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      // Baseline hint
      ctx.beginPath();
      ctx.strokeStyle = '#fafafa';
      ctx.moveTo(0, canvas.height * 0.7);
      ctx.lineTo(canvas.width, canvas.height * 0.7);
      ctx.stroke();
    }

    // Styles for Ink
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawPoints = (points: Point[], context: CanvasRenderingContext2D) => {
        if (points.length === 0) return;
        
        context.beginPath();
        if (points.length === 1) {
            // Draw a dot for single points
            // Note: color must be set before calling this
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
    ctx.strokeStyle = '#000000'; // Pure black
    ctx.fillStyle = '#000000';

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
            canvasRef.current.width = containerRef.current.offsetWidth;
            canvasRef.current.height = containerRef.current.offsetHeight;
            draw();
        }
    }
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 50); 
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
  };

  const moveDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault(); 
    const pos = getPos(e);
    setCurrentStroke(prev => [...prev, pos]);
  };

  const saveState = (newStrokes: Stroke[]) => {
      // Just save raw strokes here. Centering happens in App.tsx on navigation.
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

  const clearCanvas = () => {
    saveState([]);
  };

  const undoLast = () => {
    const remainingStrokes = strokes.slice(0, -1);
    saveState(remainingStrokes);
  };

  return (
    <div className="flex flex-col w-full h-full justify-center">
      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-[4/3] sm:aspect-square max-w-[560px] mx-auto bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden cursor-crosshair touch-none group hover:shadow-md transition-shadow duration-300"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={moveDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={moveDrawing}
          onTouchEnd={stopDrawing}
          className="w-full h-full block"
        />
        
        {/* Background Hint Character */}
        {strokes.length === 0 && !isDrawing && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                 <span className="text-[10rem] font-sans text-gray-100 opacity-60">{char}</span>
             </div>
        )}

        {/* Floating Toolbar (Vercel Style) */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-md shadow-sm">
           <button 
             onClick={undoLast} 
             className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors disabled:opacity-30" 
             disabled={strokes.length === 0}
             title="Undo"
           >
            <Undo size={16} />
          </button>
          
          <button 
            onClick={clearCanvas} 
            className="p-2 hover:bg-red-50 hover:text-red-600 rounded text-gray-600 transition-colors disabled:opacity-30"
            disabled={strokes.length === 0}
            title="Clear"
          >
            <Trash2 size={16} />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1"></div>

           <button 
            onClick={() => setShowGuides(!showGuides)} 
            className={`p-2 rounded transition-colors ${showGuides ? 'bg-gray-100 text-black' : 'hover:bg-gray-50 text-gray-400'}`}
            title="Toggle Guides"
          >
            <Grid3x3 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-400 font-medium">
          Drawing <span className="text-black font-semibold">"{char}"</span>
        </p>
      </div>
    </div>
  );
};

export default DrawingPad;