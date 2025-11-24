
import React, { useState, useMemo, useEffect } from 'react';
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
    <div className="w-[1px] h-[14px] bg-[#D9D9D9] dark:bg-neutral-700 shrink-0"></div>
);

const ToolbarButton = ({ onClick, active, children, disabled, title }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      w-7 h-7 flex items-center justify-center shrink-0 rounded-md
      ${active
        ? 'text-black dark:text-white'
        : 'text-gray-400 dark:text-neutral-500 hover:text-black dark:hover:text-white'
      }
      disabled:opacity-30 disabled:cursor-not-allowed
    `}
  >
    {children}
  </button>
);

const NumberControl = ({ value, onChange, min, max, step, icon: Icon, label }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    if (!isEditing) setInputValue(value.toString());
  }, [value, isEditing]);

  const commit = () => {
    setIsEditing(false);
    let num = parseInt(inputValue, 10);
    if (isNaN(num)) num = value;
    num = Math.max(min, Math.min(max, num));
    onChange(num);
    setInputValue(num.toString());
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2 shrink-0" title={label}>
      {Icon && <div className="text-gray-400 dark:text-neutral-500 ml-1 hidden sm:block"><Icon size={16} strokeWidth={2} /></div>}
      <div className="flex items-center">
          <button
              onClick={() => onChange(Math.max(min, value - step))}
              className="w-7 h-7 flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-black dark:hover:text-white"
          >
              <Minus size={14} strokeWidth={2.5} />
          </button>
          <div className="w-[32px] sm:w-[36px] flex justify-center">
            <input
                type="number"
                value={isEditing ? inputValue : value}
                onFocus={() => setIsEditing(true)}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === 'Enter' && commit()}
                className="w-full text-center text-[13px] font-medium text-black dark:text-white bg-transparent outline-none appearance-none p-0 m-0 [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <button
              onClick={() => onChange(Math.min(max, value + step))}
              className="w-7 h-7 flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-black dark:hover:text-white"
          >
              <Plus size={14} strokeWidth={2.5} />
          </button>
      </div>
    </div>
  );
};

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

            {/* Top Controls Container - Floating & Responsive Stack */}
            <div className="absolute top-3 inset-x-4 z-20 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-start pointer-events-none">
                
                {/* Randomize Pill - Desktop: Left, Mobile: Bottom */}
                <div className="pointer-events-auto self-start sm:self-auto">
                    <button 
                        onClick={async () => setText(await generateSampleText())}
                        className="bg-white dark:bg-neutral-800 rounded-[26px] h-[32px] px-[14px] flex items-center gap-[6px] shadow-sm hover:bg-gray-50 dark:hover:bg-neutral-700 group"
                    >
                        <RotateCcw size={14} className="text-[#ED0C14] group-hover:rotate-180" strokeWidth={2.5} />
                        <span className="text-[12px] lg:text-[13px] font-['Inter'] font-medium text-black dark:text-white">Randomize</span>
                    </button>
                </div>

                {/* Formatting Toolbar Pill - Desktop: Right, Mobile: Top (Left Aligned when stacked) */}
                <div className="pointer-events-auto self-start sm:self-auto max-w-full">
                     <div className="bg-white dark:bg-neutral-800 rounded-[26px] h-[32px] px-2 sm:px-3 flex items-center gap-1 sm:gap-3 lg:gap-4 shadow-sm select-none whitespace-nowrap overflow-hidden">
                         
                         {/* Alignment */}
                         <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
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
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 lg:px-8 py-28 relative z-10 scrollbar-thin">
                <div 
                    className="w-full min-h-full flex flex-col text-black dark:text-white break-words"
                    style={{ alignItems: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center' }}
                >
                     {text.split('\n').map((line, lIdx) => (
                        <div 
                            key={lIdx} 
                            className="flex flex-wrap max-w-full"
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
            <div className="absolute bottom-[24px] left-4 right-4 z-30 flex justify-center pointer-events-none">
                 <div className="bg-white dark:bg-neutral-800 rounded-[30px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] flex items-center w-full max-w-[320px] h-[44px] overflow-hidden border border-transparent focus-within:border-gray-200 dark:focus-within:border-neutral-700 pointer-events-auto">
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
