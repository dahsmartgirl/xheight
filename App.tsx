import React, { useState, useEffect } from 'react';
import { CHAR_SET, FontMap, Stroke } from './types';
import DrawingPad from './components/DrawingPad';
import CharacterGrid from './components/CharacterGrid';
import PreviewArea from './components/PreviewArea';
import ZenGrid from './components/ZenGrid';
import { generateFont, generateFontFamilyZip, downloadFile, centerStrokes } from './utils/svgHelpers';
import { Download, X, CheckCircle2, FileArchive, LayoutGrid, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

type ViewMode = 'CANVAS' | 'PREVIEW';

const App: React.FC = () => {
  // --- STATE ---
  const [viewMode, setViewMode] = useState<ViewMode>('CANVAS');
  const [isZenMode, setIsZenMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle
  
  const [selectedCharIndex, setSelectedCharIndex] = useState(() => {
    const saved = localStorage.getItem('scriptsmith_selectedIndex');
    return saved ? Number(saved) : 0;
  });

  const [fontMap, setFontMap] = useState<FontMap>(() => {
    try {
      const saved = localStorage.getItem('scriptsmith_fontMap');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  
  const [letterSpacing, setLetterSpacing] = useState(() => {
    const saved = localStorage.getItem('scriptsmith_spacing');
    return saved ? Number(saved) : 0;
  });

  // Default to empty string so placeholder shows
  const [fontName, setFontName] = useState(() => {
    return localStorage.getItem('scriptsmith_fontName') || "";
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const currentChar = CHAR_SET[selectedCharIndex];

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('scriptsmith_fontMap', JSON.stringify(fontMap));
  }, [fontMap]);

  useEffect(() => {
    localStorage.setItem('scriptsmith_selectedIndex', String(selectedCharIndex));
  }, [selectedCharIndex]);

  useEffect(() => {
    localStorage.setItem('scriptsmith_spacing', String(letterSpacing));
  }, [letterSpacing]);

  useEffect(() => {
    localStorage.setItem('scriptsmith_fontName', fontName);
  }, [fontName]);

  // --- ACTIONS ---

  const handleSaveStrokes = (strokes: Stroke[], width: number, height: number) => {
    setFontMap(prev => ({
      ...prev,
      [currentChar]: {
        char: currentChar,
        strokes: strokes,
        canvasWidth: width,
        canvasHeight: height
      }
    }));
  };

  const handleZenSave = (char: string, strokes: Stroke[], width: number, height: number) => {
      setFontMap(prev => ({
          ...prev,
          [char]: {
              char: char,
              strokes: strokes,
              canvasWidth: width,
              canvasHeight: height
          }
      }));
  };

  const performCentering = (targetChar: string) => {
      const currentData = fontMap[targetChar];
      if (currentData && currentData.strokes.length > 0) {
          const centered = centerStrokes(currentData.strokes, currentData.canvasWidth, currentData.canvasHeight, targetChar);
          setFontMap(prev => ({
              ...prev,
              [targetChar]: {
                  ...prev[targetChar],
                  strokes: centered
              }
          }));
      }
  };

  const centerAllGlyphs = () => {
      setFontMap(prev => {
          const newMap = { ...prev };
          let hasChanges = false;
          Object.keys(newMap).forEach(char => {
              const data = newMap[char];
              if (data && data.strokes.length > 0) {
                  const centered = centerStrokes(data.strokes, data.canvasWidth, data.canvasHeight, char);
                  if (centered !== data.strokes) {
                      newMap[char] = { ...data, strokes: centered };
                      hasChanges = true;
                  }
              }
          });
          return hasChanges ? newMap : prev;
      });
  };

  const handleSelectChar = (char: string) => {
      performCentering(currentChar); 
      const index = CHAR_SET.indexOf(char);
      if (index !== -1) {
          setSelectedCharIndex(index);
          // On mobile, close sidebar after selection
          if (window.innerWidth < 1024) setIsSidebarOpen(false);
      }
  };

  const handleNextChar = () => {
    if (selectedCharIndex < CHAR_SET.length - 1) {
        performCentering(currentChar);
        setSelectedCharIndex(prev => prev + 1);
    }
  };

  const handlePrevChar = () => {
    if (selectedCharIndex > 0) {
        performCentering(currentChar);
        setSelectedCharIndex(prev => prev - 1);
    }
  };

  const getExportName = () => {
      return fontName.trim() || "myhandwriting";
  };

  const handleExport = () => {
    centerAllGlyphs();
    const safeName = getExportName().replace(/[^a-z0-9]/gi, '_');
    const fontBuffer = generateFont(safeName, fontMap, letterSpacing);
    downloadFile(fontBuffer, `${safeName}.ttf`, 'font/ttf');
    setIsExportModalOpen(false);
  };

  const handleExportFamily = async () => {
     centerAllGlyphs();
     const safeName = getExportName().replace(/[^a-z0-9]/gi, '_');
     const zipBlob = await generateFontFamilyZip(safeName, fontMap, letterSpacing);
     
     const url = URL.createObjectURL(zipBlob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `${safeName}_Family.zip`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
     setIsExportModalOpen(false);
  };

  const completedCount = CHAR_SET.filter(c => fontMap[c] && fontMap[c].strokes.length > 0).length;
  const progressPercent = Math.round((completedCount/CHAR_SET.length)*100);

  return (
    <div className="w-full h-[100dvh] bg-white flex flex-col font-['Inter'] overflow-hidden">
      
      {/* Header - Scaled Height: 67px -> 54px */}
      <header className="h-[54px] shrink-0 border-b border-thin border-[#D9D9D9] flex items-center justify-between px-4 lg:px-[24px] bg-white z-50 relative">
        <div className="flex items-center gap-4">
             {/* Mobile Sidebar Toggle */}
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu className="text-black" size={20} />
            </button>
            
            {/* Brand - Scaled Text: 20px -> 16px */}
            <div className="flex items-center gap-1.5 select-none">
                <span className="text-[16px] font-bold tracking-tight text-[#ED0C14]">x</span>
                <span className="text-[16px] font-bold tracking-tight text-[#171717]">-height</span>
            </div>
        </div>

        {/* Download Button - Scaled Padding and Font */}
        <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-[6px] bg-[#14110F] text-white px-3 py-1.5 lg:px-[16px] lg:py-[8px] rounded-[30px] transition-colors hover:bg-black"
        >
            <div className="w-[14px] h-[14px] relative flex items-center justify-center">
                 <Download size={12} strokeWidth={2.5} />
            </div>
            <span className="text-[12px] lg:text-[13px] font-medium hidden sm:inline">Download font</span>
            <span className="text-[12px] font-medium sm:hidden">Export</span>
        </button>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Sidebar - z-index increased to 60 for mobile overlay */}
        <aside className={`
            fixed inset-y-0 left-0 z-[60] w-[260px] bg-white transform transition-transform duration-300 ease-in-out border-r border-[#D9D9D9] flex flex-col gap-[20px] p-5
            lg:relative lg:translate-x-0 lg:w-[280px] lg:p-[24px] lg:z-0
            ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'}
        `}>
            {/* Close Button Mobile */}
            <button className="absolute top-4 right-4 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                <X className="text-gray-500" size={18} />
            </button>

            {/* Font Name Section - Increased top margin on mobile to clear close button */}
            <div className="flex flex-col gap-[8px] w-full mt-10 lg:mt-0">
                <label className="text-[13px] font-medium text-black leading-tight">
                    Font name
                </label>
                {/* Input Height: 50px -> 40px */}
                <div className="h-[40px] w-full px-[16px] py-[8px] rounded-[30px] outline outline-[0.5px] outline-[#D9D9D9] flex items-center focus-within:outline-gray-400 transition-all">
                     <input 
                        type="text" 
                        value={fontName}
                        onChange={(e) => setFontName(e.target.value)}
                        className="w-full h-full bg-transparent border-none outline-none text-[13px] font-normal text-black placeholder:text-[#7B7B7B]"
                        placeholder="myhandwriting"
                     />
                </div>
            </div>

            {/* Glyphs Section */}
            <div className="flex flex-col gap-[16px] flex-1 overflow-hidden">
                 <div className="flex items-center justify-between pr-2">
                      <span className="text-[13px] font-medium text-black leading-tight">Glyphs</span>
                      <div className="h-[24px] px-[10px] bg-[rgba(255,29,37,0.10)] rounded-[20px] flex items-center justify-center">
                           <span className="text-[#ED0C14] text-[12px] font-semibold">
                              {completedCount}/{CHAR_SET.length}
                           </span>
                      </div>
                 </div>
                 
                 {/* Scrollable Grid with padding to prevent clipping */}
                 <div className="flex-1 overflow-y-auto pr-2 pb-10 scrollbar-thin pl-1 pt-1">
                      <CharacterGrid 
                          selectedChar={currentChar}
                          onSelect={handleSelectChar}
                          fontMap={fontMap}
                      />
                 </div>
            </div>
        </aside>

        {/* Overlay for mobile sidebar - z-index increased to 55 to cover header */}
        {isSidebarOpen && (
            <div className="fixed inset-0 bg-black/20 z-[55] lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {/* Main Content Area - Scaled Padding */}
        <main className="flex-1 flex flex-col gap-[16px] lg:gap-[24px] p-4 lg:p-[24px] lg:pl-[32px] bg-white overflow-hidden w-full max-w-[1200px]">
             
             {/* Top Control Bar */}
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 shrink-0">
                 
                 {/* Canvas/Preview Toggle Pill - Scaled: 50px -> 40px height */}
                 <div className="w-full sm:w-[220px] h-[40px] p-[3px] bg-[#FAFAFA] rounded-[30px] flex relative shrink-0">
                      <button 
                         onClick={() => setViewMode('CANVAS')}
                         className={`relative z-10 flex-1 h-[34px] rounded-[26px] flex items-center justify-center text-[13px] font-medium transition-all duration-200 ${viewMode === 'CANVAS' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                      >
                         Canvas
                      </button>
                      <button 
                         onClick={() => setViewMode('PREVIEW')}
                         className={`relative z-10 flex-1 h-[34px] rounded-[26px] flex items-center justify-center text-[13px] font-medium transition-all duration-200 ${viewMode === 'PREVIEW' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                      >
                         Preview
                      </button>
                 </div>

                 {/* Zen Mode Button - Scaled */}
                 <div className="flex items-center gap-[12px] self-end sm:self-auto">
                      <div className="flex items-center gap-3 bg-gray-50/50 pr-4 pl-1.5 py-1.5 rounded-full border border-transparent hover:border-gray-100 transition-all">
                           
                           {/* Redesigned Progress Indicator */}
                           <div className="relative w-[28px] h-[28px] rounded-full flex items-center justify-center shadow-inner bg-white">
                               {/* Conic Gradient for smooth chart */}
                               <div 
                                 className="absolute inset-0 rounded-full"
                                 style={{
                                     background: `conic-gradient(#ED0C14 ${progressPercent}%, #F2F2F2 ${progressPercent}% 100%)`
                                 }}
                               />
                               {/* Inner white circle to create ring effect */}
                               <div className="absolute inset-[3px] bg-white rounded-full flex items-center justify-center">
                                  <span className="text-[8px] font-bold text-gray-900">{progressPercent}%</span>
                               </div>
                           </div>

                           <div className="h-4 w-[1px] bg-gray-200"></div>

                           <button 
                             onClick={() => setIsZenMode(true)}
                             className="flex items-center gap-[6px] group"
                           >
                               <div className="w-[18px] h-[18px] flex items-center justify-center text-gray-500 group-hover:text-black transition-colors">
                                    <LayoutGrid size={14} />
                               </div>
                               <span className="text-[13px] font-medium text-gray-600 group-hover:text-black transition-colors hidden sm:inline">Enter Zen Mode</span>
                               <span className="text-[13px] font-medium text-gray-600 sm:hidden">Zen</span>
                           </button>
                      </div>
                 </div>
             </div>

             {/* Main Canvas Container */}
             <div className="flex-1 w-full relative min-h-0 flex flex-col">
                 {isZenMode ? (
                     <div className="flex-1 w-full bg-white border border-[#D9D9D9] rounded-[20px] overflow-hidden p-4 lg:p-6 relative flex flex-col">
                          <div className="flex justify-end mb-4 shrink-0">
                            <button 
                                onClick={() => setIsZenMode(false)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-full text-xs font-medium hover:border-black transition-colors"
                            >
                                Exit Zen Mode
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto">
                             <ZenGrid fontMap={fontMap} onSaveStroke={handleZenSave} />
                          </div>
                     </div>
                 ) : (
                    <>
                        {viewMode === 'CANVAS' ? (
                            <div className="w-full h-full relative flex flex-col">
                                <div className="flex-1 relative w-full h-full max-h-full">
                                    <DrawingPad 
                                        char={currentChar}
                                        onSave={handleSaveStrokes}
                                        existingStrokes={fontMap[currentChar]?.strokes}
                                    />
                                    
                                    {/* Floating Navigation Arrows - Scaled: 62px -> 48px */}
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-8 lg:gap-[160px] pointer-events-none z-30">
                                        <button 
                                            onClick={handlePrevChar}
                                            disabled={selectedCharIndex === 0}
                                            className="w-[40px] h-[40px] lg:w-[48px] lg:h-[48px] rounded-full bg-white shadow-lg flex items-center justify-center pointer-events-auto hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                            <ChevronLeft size={20} className="text-black" strokeWidth={2.5} />
                                        </button>
                                        
                                        <button 
                                            onClick={handleNextChar}
                                            disabled={selectedCharIndex === CHAR_SET.length - 1}
                                            className="w-[40px] h-[40px] lg:w-[48px] lg:h-[48px] rounded-full bg-white shadow-lg flex items-center justify-center pointer-events-auto hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                            <ChevronRight size={20} className="text-black" strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col overflow-hidden">
                                <PreviewArea 
                                    fontMap={fontMap}
                                    letterSpacing={letterSpacing}
                                    setLetterSpacing={setLetterSpacing}
                                />
                            </div>
                        )}
                    </>
                 )}
             </div>

        </main>
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm" onClick={() => setIsExportModalOpen(false)}></div>
              <div className="relative bg-white rounded-[20px] border border-[#D9D9D9] w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                  <button 
                    onClick={() => setIsExportModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                  >
                      <X size={16} />
                  </button>

                  <h3 className="text-lg font-bold text-gray-900 mb-1">Export Font</h3>
                  <p className="text-xs text-gray-500 mb-6">Download your font family ready for installation.</p>

                  <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={16} />
                           </div>
                           <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{getExportName()}</p>
                                <p className="text-[10px] text-gray-500">TrueType Font (.ttf)</p>
                           </div>
                      </div>

                      <button 
                        onClick={handleExport}
                        className="w-full bg-black text-white h-9 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                      >
                          Download Regular
                      </button>

                      <button 
                        onClick={handleExportFamily}
                        className="w-full bg-white border border-gray-200 text-gray-900 h-9 rounded-lg text-sm font-medium hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                      >
                          <FileArchive size={14} />
                          Download Font Family (ZIP)
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;