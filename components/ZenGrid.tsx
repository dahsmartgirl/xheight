import React, { useRef, useEffect } from 'react';
import { CHAR_SET, FontMap, Stroke, Point } from '../types';

interface ZenGridProps {
    fontMap: FontMap;
    onSaveStroke: (char: string, strokes: Stroke[], width: number, height: number) => void;
}

// Mini Canvas for individual cells
const ZenCell: React.FC<{
    char: string;
    existingStrokes: Stroke[];
    onSave: (strokes: Stroke[], w: number, h: number) => void;
}> = ({ char, existingStrokes, onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const currentStrokes = useRef<Stroke[]>(existingStrokes || []);
    const currentPoints = useRef<Point[]>([]);

    // Draw function
    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Guide
        ctx.fillStyle = '#fbfbfb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.7);
        ctx.lineTo(canvas.width, canvas.height * 0.7);
        ctx.stroke();

        // Ink
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
        ctx.lineWidth = 3; // Thinner for small cells

        const drawStroke = (pts: Point[]) => {
            if (pts.length === 0) return;
            ctx.beginPath();
            if (pts.length === 1) {
                ctx.arc(pts[0].x, pts[0].y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
                ctx.stroke();
            }
        };

        currentStrokes.current.forEach(s => drawStroke(s.points));
        if (isDrawing.current) drawStroke(currentPoints.current);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            // Fixed size for Zen Mode cells for performance
            canvas.width = 120; 
            canvas.height = 120;
            draw();
        }
    }, []);

    // Sync props
    useEffect(() => {
        currentStrokes.current = existingStrokes || [];
        draw();
    }, [existingStrokes]);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        // Map display size to internal resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const start = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDrawing.current = true;
        currentPoints.current = [getPos(e)];
        draw();
    };

    const move = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        e.preventDefault();
        currentPoints.current.push(getPos(e));
        draw();
    };

    const end = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        e.preventDefault();
        isDrawing.current = false;
        if (currentPoints.current.length > 0) {
            const newStrokes = [...currentStrokes.current, { points: currentPoints.current }];
            currentStrokes.current = newStrokes;
            onSave(newStrokes, canvasRef.current!.width, canvasRef.current!.height);
        }
        currentPoints.current = [];
        draw();
    };

    return (
        <div className="relative group border border-gray-100 rounded hover:border-gray-300 hover:shadow-sm transition-all bg-white">
             <span className="absolute top-1 left-2 text-[10px] font-bold text-gray-300 pointer-events-none group-hover:text-black/20">{char}</span>
             <canvas 
                ref={canvasRef}
                className="w-full h-full cursor-crosshair touch-none"
                onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
                onTouchStart={start} onTouchMove={move} onTouchEnd={end}
             />
             {currentStrokes.current.length > 0 && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onSave([], 120, 120); }}
                    className="absolute bottom-1 right-1 p-1 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                 </button>
             )}
        </div>
    );
};

const ZenGrid: React.FC<ZenGridProps> = ({ fontMap, onSaveStroke }) => {
    return (
        <div className="w-full max-w-5xl mx-auto">
             <div className="mb-6 text-center space-y-2">
                 <h2 className="text-2xl font-bold text-black">Zen Mode</h2>
                 <p className="text-gray-500 text-sm max-w-md mx-auto">
                     High-speed input. Draw continuously without navigation. Your progress is saved automatically.
                 </p>
             </div>
             
             <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 pb-20">
                 {CHAR_SET.map(char => (
                     <div key={char} className="aspect-square">
                         <ZenCell 
                            char={char} 
                            existingStrokes={fontMap[char]?.strokes} 
                            onSave={(s, w, h) => onSaveStroke(char, s, w, h)}
                         />
                     </div>
                 ))}
             </div>
        </div>
    );
};

export default ZenGrid;