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

  const [fontName, setFontName] = useState(() => {
    return localStorage.getItem('scriptsmith_fontName') || "myhandwriting";
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

  const handleExport = () => {
    centerAllGlyphs();
    const safeName = fontName.replace(/[^a-z0-9]/gi, '_') || 'xheight_Font';
    const fontBuffer = generateFont(safeName, fontMap, letterSpacing);
    downloadFile(fontBuffer, `${safeName}.ttf`, 'font/ttf');
    setIsExportModalOpen(false);
  };

  const handleExportFamily = async () => {
     centerAllGlyphs();
     const safeName = fontName.replace(/[^a-z0-9]/gi, '_') || 'xheight_Font';
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

  return (
    <div className="w-full h-[100dvh] bg-white flex flex-col font-['Inter'] overflow-hidden">
      
      {/* Header */}
      <header className="h-[67px] shrink-0 border-b border-thin border-[#D9D9D9] flex items-center justify-between px-4 lg:px-[47px] bg-white z-50 relative">
        <div className="flex items-center gap-4">
             {/* Mobile Sidebar Toggle */}
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu className="text-black" />
            </button>
            
            {/* Brand */}
            <div className="flex items-center gap-1.5 select-none">
                <span className="text-[20px] font-bold tracking-tight text-[#ED0C14]">x</span>
                <span className="text-[20px] font-bold tracking-tight text-[#171717]">-height</span>
            </div>
        </div>

        {/* Download Button */}
        <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-[7px] bg-[#14110F] text-white px-4 py-2 lg:px-[22px] lg:py-[12px] rounded-[30px] transition-colors hover:bg-black"
        >
            <div className="w-[16px] h-[16px] relative flex items-center justify-center">
                 <Download size={14} strokeWidth={2.5} />
            </div>
            <span className="text-[14px] lg:text-[16px] font-medium hidden sm:inline">Download font</span>
            <span className="text-[14px] font-medium sm:hidden">Export</span>
        </button>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Sidebar */}
        <aside className={`
            fixed inset-y-0 left-0 z-40 w-[300px] bg-white transform transition-transform duration-300 ease-in-out border-r border-[#D9D9D9] flex flex-col gap-[25px] p-6
            lg:relative lg:translate-x-0 lg:w-[370px] lg:p-[32px]
            ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'}
        `}>
            {/* Close Button Mobile */}
            <button className="absolute top-4 right-4 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                <X className="text-gray-500" />
            </button>

            {/* Font Name Section */}
            <div className="flex flex-col gap-[10px] w-full mt-8 lg:mt-0">
                <label className="text-[16px] font-medium text-black leading-[22.4px]">
                    Font name
                </label>
                <div className="h-[50px] w-full px-[20px] lg:px-[29px] py-[13px] rounded-[30px] outline outline-[0.5px] outline-[#D9D9D9] flex items-center">
                     <input 
                        type="text" 
                        value={fontName}
                        onChange={(e) => setFontName(e.target.value)}
                        className="w-full h-full bg-transparent border-none outline-none text-[16px] font-normal text-[#7B7B7B] placeholder:text-[#7B7B7B]"
                        placeholder="myhandwriting"
                     />
                </div>
            </div>

            {/* Glyphs Section */}
            <div className="flex flex-col gap-[21px] flex-1 overflow-hidden">
                 <div className="flex items-center justify-between pr-2">
                      <span className="text-[16px] font-medium text-black leading-[22.4px]">Glyphs</span>
                      <div className="h-[29px] px-[13px] bg-[rgba(255,29,37,0.10)] rounded-[20px] flex items-center justify-center">
                           <span className="text-[#ED0C14] text-[14px] font-semibold">
                              {completedCount}/{CHAR_SET.length}
                           </span>
                      </div>
                 </div>
                 
                 {/* Scrollable Grid */}
                 <div className="flex-1 overflow-y-auto pr-2 pb-10 scrollbar-thin">
                      <CharacterGrid 
                          selectedChar={currentChar}
                          onSelect={handleSelectChar}
                          fontMap={fontMap}
                      />
                 </div>
            </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
            <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col gap-[20px] lg:gap-[33px] p-4 lg:p-[36px] lg:pl-[60px] bg-white overflow-hidden w-full max-w-[1200px]">
             
             {/* Top Control Bar */}
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 shrink-0">
                 
                 {/* Canvas/Preview Toggle Pill */}
                 <div className="w-full sm:w-[261px] h-[50px] p-[3px] bg-[#FAFAFA] rounded-[30px] flex relative shrink-0">
                      <button 
                         onClick={() => setViewMode('CANVAS')}
                         className={`relative z-10 flex-1 h-[44px] rounded-[26px] flex items-center justify-center text-[16px] font-medium transition-all duration-200 ${viewMode === 'CANVAS' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                      >
                         Canvas
                      </button>
                      <button 
                         onClick={() => setViewMode('PREVIEW')}
                         className={`relative z-10 flex-1 h-[44px] rounded-[26px] flex items-center justify-center text-[16px] font-medium transition-all duration-200 ${viewMode === 'PREVIEW' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                      >
                         Preview
                      </button>
                 </div>

                 {/* Zen Mode Button */}
                 <div className="flex items-center gap-[14px] self-end sm:self-auto">
                      <div className="flex flex-col items-start gap-[2px]">
                           {/* Progress Ring Implementation */}
                           <div className="w-[37px] h-[37px] relative">
                               <svg className="w-full h-full transform -rotate-90">
                                   <circle cx="18.5" cy="18.5" r="16" fill="transparent" stroke="#F2F2F2" strokeWidth="37" />
                                   <circle 
                                      cx="18.5" cy="18.5" r="16" 
                                      fill="transparent" 
                                      stroke="#ED0C14" 
                                      strokeWidth="37" 
                                      strokeDasharray={`${(completedCount / CHAR_SET.length) * 100}, 100`} 
                                      pathLength="100"
                                   />
                               </svg>
                               <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-[10px] font-medium text-white drop-shadow-sm">{Math.round((completedCount/CHAR_SET.length)*100)}%</span>
                               </div>
                           </div>
                      </div>
                      
                      <button 
                         onClick={() => setIsZenMode(true)}
                         className="h-[44px] px-[18px] rounded-[26px] outline outline-[0.5px] outline-[#D9D9D9] flex items-center gap-[8px] hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                           <div className="w-[24px] h-[24px] flex items-center justify-center">
                                <LayoutGrid size={18} className="text-black" />
                           </div>
                           <span className="text-[16px] font-medium text-black hidden sm:inline">Enter Zen Mode</span>
                           <span className="text-[16px] font-medium text-black sm:hidden">Zen</span>
                      </button>
                 </div>
             </div>

             {/* Main Canvas Container */}
             <div className="flex-1 w-full relative min-h-0 flex flex-col">
                 {isZenMode ? (
                     <div className="flex-1 w-full bg-white border border-[#D9D9D9] rounded-[20px] overflow-hidden p-4 lg:p-8 relative flex flex-col">
                          <div className="flex justify-end mb-4 shrink-0">
                            <button 
                                onClick={() => setIsZenMode(false)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-full text-sm font-medium hover:border-black transition-colors"
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
                                    
                                    {/* Floating Navigation Arrows */}
                                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-12 lg:gap-[233px] pointer-events-none z-30">
                                        <button 
                                            onClick={handlePrevChar}
                                            disabled={selectedCharIndex === 0}
                                            className="w-[50px] h-[50px] lg:w-[62px] lg:h-[62px] rounded-full bg-white shadow-lg flex items-center justify-center pointer-events-auto hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                            <ChevronLeft size={24} className="text-black" strokeWidth={2.5} />
                                        </button>
                                        
                                        <button 
                                            onClick={handleNextChar}
                                            disabled={selectedCharIndex === CHAR_SET.length - 1}
                                            className="w-[50px] h-[50px] lg:w-[62px] lg:h-[62px] rounded-full bg-white shadow-lg flex items-center justify-center pointer-events-auto hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                            <ChevronRight size={24} className="text-black" strokeWidth={2.5} />
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
                                <p className="text-xs font-bold text-gray-900 truncate">{fontName}</p>
                                <p className="text-[10px] text-gray-500">TrueType Font (.ttf)</p>
                           </div>
                      </div>

                      <button 
                        onClick={handleExport}
                        className="w-full bg-black text-white h-10 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                      >
                          Download Regular
                      </button>

                      <button 
                        onClick={handleExportFamily}
                        className="w-full bg-white border border-gray-200 text-gray-900 h-10 rounded-lg text-sm font-medium hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
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