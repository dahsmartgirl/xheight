import React from 'react';
import { CHAR_SET, FontMap } from '../types';
import { strokesToPath } from '../utils/svgHelpers';

interface CharacterGridProps {
  selectedChar: string;
  onSelect: (char: string) => void;
  fontMap: FontMap;
}

const CharacterGrid: React.FC<CharacterGridProps> = ({ selectedChar, onSelect, fontMap }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-x-[12px] lg:gap-x-[12px] gap-y-[16px] pb-20 content-start p-[2px]">
      {CHAR_SET.map(char => {
        const data = fontMap[char];
        const hasData = data && data.strokes.length > 0;
        const isSelected = selectedChar === char;
        
        return (
          <button
            key={char}
            onClick={() => onSelect(char)}
            className={`
              relative flex flex-col items-center justify-start rounded-[16px] transition-all duration-200 group w-full aspect-[79/121]
              ${isSelected 
                ? 'border-red-brand text-red-brand outline-[0.5px] outline outline-[#ED0C14] shadow-sm z-10' 
                : 'border-gray-brand text-gray-brand outline-[0.5px] outline outline-[#D9D9D9] hover:border-gray-400 hover:z-10'
              }
            `}
          >
            {/* Visual Preview Area (Top) */}
            <div className="w-full h-[65%] relative flex items-center justify-center p-1.5 border-b border-transparent">
               {hasData ? (
                 <svg viewBox={`0 0 ${data.canvasWidth} ${data.canvasHeight}`} className="w-full h-full">
                    <path 
                       d={strokesToPath(data.strokes, 1, 0, 0)} 
                       fill="none" 
                       stroke="currentColor" 
                       strokeWidth="12" 
                       strokeLinecap="round" 
                       strokeLinejoin="round"
                    />
                 </svg>
               ) : (
                  <div className="w-full h-0 border-b border-[#F2F2F2] mt-[20%]"></div>
               )}
            </div>

            {/* Character Label (Bottom) - Scaled: 40px -> 28px */}
            <div className="flex-1 flex items-center justify-center pb-2">
                <span className="text-[24px] lg:text-[28px] font-normal leading-none font-['Inter']">
                    {char}
                </span>
            </div>
            
          </button>
        );
      })}
    </div>
  );
};

export default CharacterGrid;