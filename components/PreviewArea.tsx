import React, { useState, useMemo } from 'react';
import { FontMap } from '../types';
import { strokesToPath, smoothStrokes, alignStrokes } from '../utils/svgHelpers';
import { Sparkles, Type, MoveHorizontal, RefreshCw } from 'lucide-react';
import { generateSampleText } from '../services/geminiService';

interface PreviewAreaProps {
  fontMap: FontMap;
  letterSpacing: number;
  setLetterSpacing: (val: number) => void;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ fontMap, letterSpacing, setLetterSpacing }) => {
  const [text, setText] = useState("The quick brown fox jumps over the lazy dog.");
  const [fontSize, setFontSize] = useState(60);

  const handleGenerateStory = async () => {
    const sample = await generateSampleText();
    setText(sample);
  };
  
  // Pre-process strokes
  const processedFontMap = useMemo(() => {
    const newMap: any = {};
    Object.keys(fontMap).forEach(key => {
        const data = fontMap[key];
        if (data.strokes.length > 0) {
            const smoothed = smoothStrokes(data.strokes);
            // Strokes are already centered by App.tsx on navigation, but aligning ensures horizontal consistency
            const aligned = alignStrokes(smoothed, data.canvasWidth);
            newMap[key] = { ...data, strokes: aligned };
        } else {
            newMap[key] = data;
        }
    });
    return newMap;
  }, [fontMap]);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          
          <div className="flex flex-wrap items-center gap-6 w-full sm:w-auto px-2">
             {/* Font Size */}
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-gray-500">
                   <Type size={14} />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Size</span>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                       type="range" 
                       min="10" 
                       max="200" 
                       value={fontSize} 
                       onChange={(e) => setFontSize(Number(e.target.value))}
                       className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                    <span className="text-xs font-mono text-gray-700 w-[3ch] text-right">{fontSize}</span>
                </div>
             </div>

             {/* Letter Spacing */}
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-gray-500">
                   <MoveHorizontal size={14} />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Spacing</span>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                       type="range" 
                       min="-200" 
                       max="500" 
                       step="1"
                       value={letterSpacing} 
                       onChange={(e) => setLetterSpacing(Number(e.target.value))}
                       className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                    <span className="text-xs font-mono text-gray-700 w-[4ch] text-right">{letterSpacing}</span>
                </div>
             </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleGenerateStory}
                  className="geist-button-secondary flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm"
                >
                    <RefreshCw size={14} />
                    Sample Text
                </button>
           </div>
      </div>
      
      {/* Editor Split View */}
      <div className="geist-card overflow-hidden flex flex-col lg:flex-row min-h-[500px]">
        {/* Left: Input */}
        <div className="w-full lg:w-[40%] bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Input Text</label>
            </div>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 w-full bg-transparent p-6 outline-none resize-none text-gray-800 font-sans text-lg leading-relaxed placeholder:text-gray-300 focus:bg-white transition-colors"
                placeholder="Type something here to preview..."
            />
        </div>

        {/* Right: Output */}
        <div className="w-full lg:w-[60%] bg-white relative flex flex-col">
             <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px)', backgroundSize: `100% ${fontSize * 1.2}px` }}></div>
             
             <div className="p-4 border-b border-gray-100 z-10 bg-white sticky top-0">
                 <label className="text-[10px] font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12} /> Rendered Result
                 </label>
             </div>
             
             <div className="p-8 flex-1 overflow-y-auto">
                 <div className="flex flex-wrap gap-y-4 content-start">
                    {text.split(' ').map((word, wIdx) => (
                        <div key={wIdx} className="flex whitespace-nowrap items-end mr-4" style={{ height: fontSize, marginBottom: fontSize * 0.4 }}>
                            {word.split('').map((char, cIdx) => {
                                const data = processedFontMap[char];
                                
                                // Placeholder for missing char
                                if (!data || data.strokes.length === 0) {
                                    return (
                                        <div key={cIdx} className="flex items-end justify-center pb-1 text-gray-200 font-serif italic border-b border-transparent" style={{ width: fontSize * 0.5, fontSize: fontSize * 0.8 }}>
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
        </div>
      </div>
    </div>
  );
};

export default PreviewArea;