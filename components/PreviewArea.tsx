import React, { useState, useMemo } from 'react';
import { FontMap } from '../types';
import { strokesToPath, smoothStrokes, alignStrokes } from '../utils/svgHelpers';
import { Type, MoveHorizontal, MoveVertical, AlignLeft, AlignCenter, AlignRight, RotateCcw } from 'lucide-react';
import { generateSampleText } from '../services/geminiService';

interface PreviewAreaProps {
  fontMap: FontMap;
  letterSpacing: number;
  setLetterSpacing: (val: number) => void;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ fontMap, letterSpacing, setLetterSpacing }) => {
  const [text, setText] = useState("The quick brown fox\njumps over the lazy dog.");
  const [fontSize, setFontSize] = useState(64);
  const [lineHeight, setLineHeight] = useState(1.4);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // Pre-process strokes for smoother rendering
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
    <div className="flex flex-col h-full w-full bg-[#F5F5F5] relative">
        
        {/* Toolbar */}
        <div className="shrink-0 px-4 lg:px-6 py-4 bg-white border-b border-[#E5E5E5] flex flex-col gap-4 z-20 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                
                {/* Sliders Group */}
                <div className="flex items-center gap-6 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                    {/* Size */}
                    <div className="flex items-center gap-3 shrink-0">
                        <Type size={16} className="text-gray-400" />
                        <input 
                           type="range" 
                           min="20" 
                           max="150" 
                           value={fontSize} 
                           onChange={(e) => setFontSize(Number(e.target.value))}
                           className="h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black w-24"
                        />
                    </div>
                    {/* Spacing */}
                    <div className="flex items-center gap-3 shrink-0">
                        <MoveHorizontal size={16} className="text-gray-400" />
                        <input 
                           type="range" 
                           min="-100" 
                           max="200" 
                           value={letterSpacing} 
                           onChange={(e) => setLetterSpacing(Number(e.target.value))}
                           className="h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black w-24"
                        />
                    </div>
                    {/* Line Height */}
                    <div className="flex items-center gap-3 shrink-0">
                        <MoveVertical size={16} className="text-gray-400" />
                        <input 
                           type="range" 
                           min="0.8" 
                           max="3" 
                           step="0.1"
                           value={lineHeight} 
                           onChange={(e) => setLineHeight(Number(e.target.value))}
                           className="h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black w-24"
                        />
                    </div>
                </div>

                {/* Alignment & Actions */}
                <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
                        <button 
                            onClick={() => setTextAlign('left')} 
                            className={`p-1.5 rounded transition-all ${textAlign === 'left' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <AlignLeft size={16}/>
                        </button>
                        <button 
                            onClick={() => setTextAlign('center')} 
                            className={`p-1.5 rounded transition-all ${textAlign === 'center' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <AlignCenter size={16}/>
                        </button>
                        <button 
                            onClick={() => setTextAlign('right')} 
                            className={`p-1.5 rounded transition-all ${textAlign === 'right' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <AlignRight size={16}/>
                        </button>
                    </div>
                    <button 
                       onClick={async () => setText(await generateSampleText())}
                       className="p-2 text-gray-400 hover:text-black transition-colors"
                       title="Randomize Text"
                    >
                        <RotateCcw size={18} />
                    </button>
                </div>
            </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-12 bg-[#F5F5F5]">
            <div 
                 className="max-w-5xl mx-auto min-h-[500px] bg-white shadow-sm border border-[#E5E5E5] rounded-xl p-8 lg:p-12 transition-all cursor-text"
                 onClick={() => document.getElementById('preview-input')?.focus()}
            >
                {text.split('\n').map((line, lIdx) => (
                    <div 
                        key={lIdx} 
                        className="flex flex-wrap w-full"
                        style={{ 
                            justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
                            marginBottom: fontSize * (lineHeight - 1)
                        }}
                    >
                        {line === '' ? <div style={{ height: fontSize }}>&nbsp;</div> : line.split('').map((char, cIdx) => {
                                const data = processedFontMap[char];
                                
                                // Handle Space
                                if (char === ' ') {
                                    return <div key={cIdx} style={{ width: fontSize * 0.4, height: fontSize }}></div>;
                                }

                                // Placeholder for missing char
                                if (!data || data.strokes.length === 0) {
                                    return (
                                        <div key={cIdx} className="flex items-end justify-center pb-1 text-gray-200 border-b border-gray-100" style={{ width: fontSize * 0.5, height: fontSize }}>
                                            <span style={{ fontSize: fontSize * 0.4 }}>{char}</span>
                                        </div>
                                    );
                                }

                                const scale = fontSize / data.canvasHeight;
                                const charWidth = data.canvasWidth * scale;
                                const charHeight = fontSize;

                                const baseAdvance = charWidth * 0.75; // tighter fit for display
                                const spacingAdjustment = (letterSpacing / 100) * fontSize;
                                const containerWidth = Math.max(0, baseAdvance + spacingAdjustment);

                                return (
                                    <div 
                                      key={cIdx} 
                                      className="relative flex-shrink-0" 
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

        {/* Input Area */}
        <div className="shrink-0 bg-white border-t border-[#E5E5E5] p-4 lg:p-6 z-20">
            <textarea
                id="preview-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-20 bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-sans resize-none placeholder:text-gray-400"
                placeholder="Type here to preview your custom font..."
            />
        </div>
    </div>
  );
};

export default PreviewArea;