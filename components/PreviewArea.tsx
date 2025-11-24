
import React, { useState, useMemo } from 'react';
import { FontMap } from '../types';
import { strokesToPath, smoothStrokes, alignStrokes } from '../utils/svgHelpers';
import { Type, MoveHorizontal, AlignLeft, AlignCenter, AlignRight, RotateCcw, Plus, Minus } from 'lucide-react';
import { generateSampleText } from '../services/geminiService';

interface PreviewAreaProps {
  fontMap: FontMap;
  letterSpacing: number;
  setLetterSpacing: (val: number) => void;
}

const ToolbarDivider = () => (
    <div className="w-[1px] h-[14px] bg-[#D9D9D9] dark:bg-neutral-700 shrink-0 mx-1"></div>
);

const ToolbarButton = ({ onClick, active, children, disabled, title }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0
      ${active
        ? 'text-black dark:text-white bg-gray-100 dark:bg-neutral-700 font-medium'
        : 'text-gray-400 dark:text-neutral-500 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-800'
      }
      disabled:opacity-30 disabled:cursor-not-allowed
    `}
  >
    {children}
  </button>
);

const NumberControl = ({ value, onChange, min, max, step, icon: Icon, label }: any) => (
  <div className="flex items-center gap-2 shrink-0" title={label}>
    {Icon && <div className="text-gray-400 dark:text-neutral-500 ml-1"><Icon size={16} strokeWidth={2} /></div>}
    <div className="flex items-center">
        <button
            onClick={() => onChange(Math.max(min, value - step))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-neutral-500 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
        >
            <Minus size={14} strokeWidth={2.5} />
        </button>
        <span className="min-w-[32px] text-center text-[13px] font-medium text-black dark:text-white tabular-nums select-none">
            {value}
        </span>
        <button
            onClick={() => onChange(Math.min(max, value + step))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-neutral-500 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
        >
            <Plus size={14} strokeWidth={2.5} />
        </button>
    </div>
  </div>
);

const PreviewArea: React.FC<PreviewAreaProps> = ({ fontMap, letterSpacing, setLetterSpacing }) => {
  const [text, setText] = useState("The quick brown fox\njumps over the lazy dog.");
  const [fontSize, setFontSize] = useState(64);
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
        <div className="relative flex-1 w-full bg-[#FAFAFA] dark:bg-neutral-900 rounded-[20px] overflow-hidden border border-transparent flex flex-col">
            
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

            {/* Top Left: Randomize Pill */}
            <div className="absolute top-[12px] left-[16px] z-20">
                <button 
                    onClick={async () => setText(await generateSampleText())}
                    className="bg-white dark:bg-neutral-800 rounded-[26px] h-[32px] px-[14px] flex items-center gap-[6px] shadow-sm hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                    <RotateCcw size={14} className="text-[#ED0C14]" strokeWidth={2.5} />
                    <span className="text-[12px] lg:text-[13px] font-['Inter'] font-medium text-black dark:text-white hidden sm:inline">Randomize</span>
                </button>
            </div>

            {/* Top Right: Formatting Toolbar Pill */}
            <div className="absolute top-[12px] right-[16px] z-20 max-w-[calc(100%-140px)] sm:max-w-none">
                 <div className="bg-white dark:bg-neutral-800 rounded-[26px] h-[32px] px-2 sm:px-3 flex items-center gap-1 sm:gap-2 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                     
                     {/* Alignment */}
                     <div className="flex items-center gap-0.5 shrink-0">
                        <ToolbarButton active={textAlign === 'left'} onClick={() => setTextAlign('left')} title="Align Left">
                            <AlignLeft size={16} strokeWidth={2.5}/>
                        </ToolbarButton>
                        <ToolbarButton active={textAlign === 'center'} onClick={() => setTextAlign('center')} title="Align Center">
                            <AlignCenter size={16} strokeWidth={2.5}/>
                        </ToolbarButton>
                        <ToolbarButton active={textAlign === 'right'} onClick={() => setTextAlign('right')} title="Align Right">
                            <AlignRight size={16} strokeWidth={2.5}/>
                        </ToolbarButton>
                     </div>

                     <ToolbarDivider />

                     {/* Font Size */}
                     <NumberControl 
                        value={fontSize}
                        onChange={setFontSize}
                        min={20}
                        max={150}
                        step={5}
                        icon={Type}
                        label="Font Size"
                     />

                     <ToolbarDivider />

                     {/* Letter Spacing */}
                     <NumberControl 
                        value={letterSpacing}
                        onChange={setLetterSpacing}
                        min={-50}
                        max={200}
                        step={5}
                        icon={MoveHorizontal}
                        label="Letter Spacing"
                     />

                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 lg:px-8 py-24 relative z-10 scrollbar-thin">
                <div 
                    className="w-full min-h-full flex flex-col text-black dark:text-white break-words transition-all duration-300 ease-out"
                    style={{ alignItems: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center' }}
                >
                     {text.split('\n').map((line, lIdx) => (
                        <div 
                            key={lIdx} 
                            className="flex flex-wrap max-w-full transition-all duration-300"
                            style={{ 
                                justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center',
                                marginBottom: fontSize * 0.4,
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
                                            <div key={cIdx} className="flex items-end justify-center pb-1 text-gray-200 dark:text-neutral-700 border-b border-gray-100 dark:border-neutral-800" style={{ width: fontSize * 0.5, height: fontSize }}>
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
                                              className="overflow-visible"
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

            {/* Floating Input Pill */}
            <div className="absolute bottom-[24px] left-4 right-4 z-30 flex justify-center">
                 <div className="bg-white dark:bg-neutral-800 rounded-[30px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] flex items-center w-full max-w-[320px] h-[44px] overflow-hidden border border-transparent focus-within:border-gray-200 dark:focus-within:border-neutral-700 transition-colors">
                     <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-full bg-transparent border-none outline-none text-[14px] px-5 font-['Inter'] placeholder:text-gray-400 dark:placeholder:text-neutral-500 text-center text-black dark:text-white"
                        placeholder="Type to preview..."
                     />
                 </div>
            </div>

        </div>
    </div>
  );
};

export default PreviewArea;
