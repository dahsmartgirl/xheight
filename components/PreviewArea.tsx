
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
    <div className="w-full h-full relative flex flex-col">
        {/* Canvas-like Container */}
        <div className="relative flex-1 w-full bg-[#FAFAFA] rounded-[20px] overflow-hidden border border-transparent flex flex-col">
            
            {/* Background Grid Pattern - Matches DrawingPad */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

            {/* Top Controls Wrapper - Uses Flex Wrap for responsive stacking without overlap */}
            <div className="absolute top-0 left-0 right-0 p-3 lg:p-4 z-20 flex flex-wrap justify-between gap-2 pointer-events-none">
                
                {/* Randomize Button */}
                <button 
                    onClick={async () => setText(await generateSampleText())}
                    className="pointer-events-auto bg-white rounded-[26px] h-[36px] px-[12px] lg:px-[14px] flex items-center gap-[6px] shadow-sm hover:shadow-md transition-all border border-transparent active:scale-95 shrink-0"
                >
                    <RotateCcw size={14} className="text-[#ED0C14]" strokeWidth={2.5} />
                    <span className="text-[12px] lg:text-[13px] font-['Inter'] font-medium text-black hidden sm:inline">Randomize</span>
                </button>

                {/* Toolbar */}
                <div className="pointer-events-auto bg-white rounded-[26px] h-[36px] px-3 lg:px-4 flex items-center gap-3 lg:gap-4 shadow-sm max-w-full overflow-x-auto no-scrollbar touch-pan-x shrink-0">
                     {/* Alignment */}
                     <div className="flex items-center gap-1 shrink-0">
                        <button 
                            onClick={() => setTextAlign('left')} 
                            className={`p-1 rounded-full transition-colors ${textAlign === 'left' ? 'text-black bg-gray-100' : 'text-gray-400 hover:text-black'}`}
                        >
                            <AlignLeft size={14} strokeWidth={2.5}/>
                        </button>
                        <button 
                            onClick={() => setTextAlign('center')} 
                            className={`p-1 rounded-full transition-colors ${textAlign === 'center' ? 'text-black bg-gray-100' : 'text-gray-400 hover:text-black'}`}
                        >
                            <AlignCenter size={14} strokeWidth={2.5}/>
                        </button>
                        <button 
                            onClick={() => setTextAlign('right')} 
                            className={`p-1 rounded-full transition-colors ${textAlign === 'right' ? 'text-black bg-gray-100' : 'text-gray-400 hover:text-black'}`}
                        >
                            <AlignRight size={14} strokeWidth={2.5}/>
                        </button>
                     </div>

                     <div className="w-[1px] h-[14px] bg-[#D9D9D9] shrink-0"></div>

                     {/* Sliders */}
                     <div className="flex items-center gap-3 shrink-0">
                        {/* Font Size */}
                        <div className="flex items-center gap-2" title="Font Size">
                            <Type size={14} className="text-gray-400" strokeWidth={2.5} />
                            <input 
                               type="range" 
                               min="20" 
                               max="150" 
                               value={fontSize} 
                               onChange={(e) => setFontSize(Number(e.target.value))}
                               className="h-1 w-12 sm:w-16 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                            />
                        </div>
                        {/* Spacing */}
                        <div className="flex items-center gap-2" title="Letter Spacing">
                            <MoveHorizontal size={14} className="text-gray-400" strokeWidth={2.5} />
                            <input 
                               type="range" 
                               min="-100" 
                               max="200" 
                               value={letterSpacing} 
                               onChange={(e) => setLetterSpacing(Number(e.target.value))}
                               className="h-1 w-12 sm:w-16 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                            />
                        </div>
                        {/* Line Height */}
                        <div className="flex items-center gap-2" title="Line Height">
                            <MoveVertical size={14} className="text-gray-400" strokeWidth={2.5} />
                            <input 
                               type="range" 
                               min="0.8" 
                               max="3" 
                               step="0.1"
                               value={lineHeight} 
                               onChange={(e) => setLineHeight(Number(e.target.value))}
                               className="h-1 w-12 sm:w-16 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                            />
                        </div>
                     </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-16 lg:py-20 relative z-10">
                <div 
                    className="w-full min-h-full flex flex-col"
                    style={{ alignItems: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center' }}
                >
                     {text.split('\n').map((line, lIdx) => (
                        <div 
                            key={lIdx} 
                            className="flex flex-wrap max-w-full"
                            style={{ 
                                justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
                                marginBottom: fontSize * (lineHeight - 1),
                                width: '100%'
                            }}
                        >
                            {line === '' ? <div style={{ height: fontSize }}>&nbsp;</div> : line.split('').map((char, cIdx) => {
                                    const data = processedFontMap[char];
                                    
                                    if (char === ' ') {
                                        return <div key={cIdx} style={{ width: fontSize * 0.4, height: fontSize }}></div>;
                                    }

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
                                    const baseAdvance = charWidth * 0.75;
                                    const spacingAdjustment = (letterSpacing / 100) * fontSize;
                                    const containerWidth = Math.max(0, baseAdvance + spacingAdjustment);

                                    return (
                                        <div key={cIdx} className="relative flex-shrink-0" style={{ width: containerWidth, height: charHeight }}>
                                            <svg 
                                              viewBox={`0 0 ${charWidth} ${charHeight}`} 
                                              width={charWidth}
                                              height={charHeight}
                                              className="overflow-visible text-black"
                                              style={{ position: 'absolute', left: 0, top: 0, maxWidth: 'none' }}
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

            {/* Floating Input Pill - Clean Style */}
            <div className="absolute bottom-[24px] left-4 right-4 z-30 flex justify-center">
                 <div className="bg-white rounded-[30px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] flex items-center w-full max-w-[320px] h-[44px] overflow-hidden transition-all">
                     <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-full bg-transparent border-none outline-none text-[14px] px-5 font-['Inter'] placeholder:text-gray-400 text-center"
                        placeholder="Type to preview..."
                     />
                 </div>
            </div>

        </div>
    </div>
  );
};

export default PreviewArea;
