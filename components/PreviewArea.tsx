import React, { useState, useMemo } from 'react';
import { FontMap } from '../types';
import { strokesToPath, smoothStrokes, alignStrokes } from '../utils/svgHelpers';
import { Type, MoveHorizontal } from 'lucide-react';
import { generateSampleText } from '../services/geminiService';

interface PreviewAreaProps {
  fontMap: FontMap;
  letterSpacing: number;
  setLetterSpacing: (val: number) => void;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ fontMap, letterSpacing, setLetterSpacing }) => {
  const [text, setText] = useState("The quick brown fox jumps over the lazy dog.");
  const [fontSize, setFontSize] = useState(80);

  // Pre-process strokes
  const processedFontMap = useMemo(() => {
    const newMap: any = {};
    Object.keys(fontMap).forEach(key => {
        const data = fontMap[key];
        if (data.strokes.length > 0) {
            const smoothed = smoothStrokes(data.strokes);
            const aligned = alignStrokes(smoothed, data.canvasWidth);
            newMap[key] = { ...data, strokes: aligned };
        } else {
            newMap[key] = data;
        }
    });
    return newMap;
  }, [fontMap]);

  return (
    <div className="flex flex-col h-full w-full bg-[#FAFAFA] rounded-[20px] overflow-hidden relative">
        
        {/* Controls Overlay */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 lg:px-8 py-6 z-10 gap-4 border-b sm:border-b-0 border-gray-100">
             <div className="flex flex-wrap items-center gap-4 lg:gap-8 w-full sm:w-auto">
                 {/* Font Size */}
                 <div className="flex items-center gap-3">
                    <Type size={16} className="text-gray-400" />
                    <input 
                       type="range" 
                       min="20" 
                       max="200" 
                       value={fontSize} 
                       onChange={(e) => setFontSize(Number(e.target.value))}
                       className="w-24 lg:w-32 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                 </div>

                 {/* Letter Spacing */}
                 <div className="flex items-center gap-3">
                    <MoveHorizontal size={16} className="text-gray-400" />
                    <input 
                       type="range" 
                       min="-200" 
                       max="500" 
                       step="1"
                       value={letterSpacing} 
                       onChange={(e) => setLetterSpacing(Number(e.target.value))}
                       className="w-24 lg:w-32 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                 </div>
             </div>

             <button 
               onClick={async () => setText(await generateSampleText())}
               className="text-xs font-medium text-gray-400 hover:text-black transition-colors self-end sm:self-auto"
             >
                 Randomize
             </button>
        </div>

        {/* Input & Output */}
        <div className="flex-1 flex flex-col overflow-hidden">
             {/* Text Output Area */}
             <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col items-center">
                 <div className="flex flex-wrap gap-y-4 content-start justify-center max-w-4xl">
                    {text.split(' ').map((word, wIdx) => (
                        <div key={wIdx} className="flex whitespace-nowrap items-end mr-4 mb-4" style={{ height: fontSize }}>
                            {word.split('').map((char, cIdx) => {
                                const data = processedFontMap[char];
                                
                                // Placeholder for missing char
                                if (!data || data.strokes.length === 0) {
                                    return (
                                        <div key={cIdx} className="flex items-end justify-center pb-1 text-gray-300 font-serif italic border-b border-transparent" style={{ width: fontSize * 0.5, fontSize: fontSize * 0.8 }}>
                                            {char}
                                        </div>
                                    );
                                }

                                const scale = fontSize / data.canvasHeight;
                                const charWidth = data.canvasWidth * scale;
                                const charHeight = fontSize;

                                const baseAdvance = charWidth * 0.75;
                                const spacingAdjustment = (letterSpacing / 100) * fontSize;
                                const containerWidth = Math.max(0, baseAdvance + spacingAdjustment);

                                return (
                                    <div 
                                      key={cIdx} 
                                      className="relative flex-shrink-0 group" 
                                      style={{ width: containerWidth, height: charHeight }}
                                    >
                                        <svg 
                                          viewBox={`0 0 ${charWidth} ${charHeight}`} 
                                          width={charWidth}
                                          height={charHeight}
                                          className="overflow-visible text-black"
                                          style={{ 
                                            position: 'absolute', 
                                            left: 0, 
                                            top: 0,
                                            maxWidth: 'none' 
                                          }}
                                        >
                                            <path 
                                              d={strokesToPath(data.strokes, scale, 0, 0)} 
                                              fill="currentColor"
                                              stroke="currentColor" 
                                              strokeWidth="2"
                                              strokeLinecap="round" 
                                              strokeLinejoin="round" 
                                              style={{ fill: 'none' }} 
                                            />
                                        </svg>
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Input Field */}
            <div className="p-0 border-t border-gray-200 mx-4 lg:mx-8 mb-8">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full h-24 pt-6 outline-none text-center text-gray-500 font-sans text-lg placeholder:text-gray-300 resize-none bg-transparent"
                    placeholder="Type to preview..."
                />
            </div>
        </div>
    </div>
  );
};

export default PreviewArea;