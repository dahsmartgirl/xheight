import React from 'react';
import { CHAR_SET, FontMap } from '../types';

interface CharacterGridProps {
  selectedChar: string;
  onSelect: (char: string) => void;
  fontMap: FontMap;
}

const CharacterGrid: React.FC<CharacterGridProps> = ({ selectedChar, onSelect, fontMap }) => {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[300px] lg:max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
      {CHAR_SET.map(char => {
        const hasData = fontMap[char] && fontMap[char].strokes.length > 0;
        const isSelected = selectedChar === char;
        return (
          <button
            key={char}
            onClick={() => onSelect(char)}
            className={`
              relative aspect-square flex items-center justify-center text-sm font-medium rounded-md transition-all duration-200
              ${isSelected 
                ? 'bg-black text-white shadow-md z-10' 
                : hasData 
                    ? 'bg-white text-black border border-black/10 hover:border-black' 
                    : 'bg-white text-gray-300 border border-gray-100 hover:border-gray-300 hover:text-gray-500'
              }
            `}
          >
            {char}
            {hasData && !isSelected && (
              <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-black"></span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default CharacterGrid;