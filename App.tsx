import React, { useState, useEffect } from 'react';
import { CHAR_SET, FontMap, Stroke, AppTab } from './types';
import DrawingPad from './components/DrawingPad';
import CharacterGrid from './components/CharacterGrid';
import PreviewArea from './components/PreviewArea';
import { generateFont, downloadFile, centerStrokes } from './utils/svgHelpers';
import { Pencil, Download, ChevronRight, ChevronLeft, Sparkles, Type, Smartphone, Monitor, CheckCircle2, X, Save } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE INITIALIZATION ---

  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.CREATE);
  
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
    return localStorage.getItem('scriptsmith_fontName') || "MyHandwriting";
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSavedIndicatorVisible, setIsSavedIndicatorVisible] = useState(false);

  const currentChar = CHAR_SET[selectedCharIndex];

  // --- AUTO-SAVE EFFECTS ---

  useEffect(() => {
    localStorage.setItem('scriptsmith_fontMap', JSON.stringify(fontMap));
    setIsSavedIndicatorVisible(true);
    const timer = setTimeout(() => setIsSavedIndicatorVisible(false), 2000);
    return () => clearTimeout(timer);
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


  // --- HANDLERS ---

  const handleSaveStrokes = (strokes: Stroke[], width: number, height: number) => {
    // Save strokes immediately as drawn (uncentered)
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

  // Centering Logic triggering on Navigation
  const performCentering = (targetChar: string) => {
      const currentData = fontMap[targetChar];
      if (currentData && currentData.strokes.length > 0) {
          // Pass the character to centerStrokes to handle descenders (g, j, p, q, y) smartly
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

  const handleNext = () => {
    performCentering(currentChar); // Center existing char before leaving
    if (selectedCharIndex < CHAR_SET.length - 1) {
      setSelectedCharIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    performCentering(currentChar); // Center existing char before leaving
    if (selectedCharIndex > 0) {
      setSelectedCharIndex(prev => prev - 1);
    }
  };

  const handleSelectChar = (char: string) => {
      performCentering(currentChar); // Center existing char before leaving
      const index = CHAR_SET.indexOf(char);
      if (index !== -1) setSelectedCharIndex(index);
  };

  const handleExport = () => {
    // Ensure current is centered before export just in case
    performCentering(currentChar);
    
    const safeName = fontName.replace(/[^a-z0-9]/gi, '_') || 'ScriptSmith_Font';
    
    const fontBuffer = generateFont(safeName, fontMap, letterSpacing);
    downloadFile(fontBuffer, `${safeName}.otf`, 'font/otf');
    setIsExportModalOpen(false);
  };

  const calculateProgress = () => {
    const completed = CHAR_SET.filter(c => fontMap[c] && fontMap[c].strokes.length > 0).length;
    return Math.round((completed / CHAR_SET.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto h-14 flex items-center justify-between px-4 sm:px-6">
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white">
              <Pencil size={14} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm tracking-tight text-gray-900">ScriptSmith</span>
          </div>

          {/* Vercel-style Tab Navigation */}
          <div className="flex gap-6">
            {[
              { id: AppTab.CREATE, label: 'Create' },
              { id: AppTab.PREVIEW, label: 'Preview' },
              { id: AppTab.EXPORT, label: 'Export' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                    if(currentTab === AppTab.CREATE && tab.id !== AppTab.CREATE) performCentering(currentChar);
                    setCurrentTab(tab.id);
                }}
                className={`
                  relative text-sm h-14 border-b-2 transition-colors duration-200
                  ${currentTab === tab.id 
                    ? 'border-black text-black font-medium' 
                    : 'border-transparent text-gray-500 hover:text-gray-800'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
             {/* Auto Save Indicator */}
             <div className={`hidden sm:flex items-center gap-1.5 text-[10px] font-medium text-gray-400 transition-opacity duration-300 ${isSavedIndicatorVisible ? 'opacity-100' : 'opacity-0'}`}>
                <Save size={12} /> Saved
             </div>

             {/* Minimal Progress Circle */}
             <div className="flex items-center gap-2">
                 <div className="w-5 h-5 relative">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-gray-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        <path 
                          className="text-black transition-all duration-500" 
                          strokeDasharray={`${progress}, 100`} 
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        />
                    </svg>
                 </div>
                 <span className="text-xs font-medium text-gray-600">{progress}%</span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        {currentTab === AppTab.CREATE && (
          <div className="flex flex-col lg:flex-row gap-8 items-start h-full">
            
            {/* Left: Navigation/Grid */}
            <div className="w-full lg:w-[320px] lg:sticky lg:top-24 order-2 lg:order-1 space-y-4">
               <div className="geist-card p-4 bg-white">
                  <div className="flex items-center justify-between mb-4 px-1">
                     <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                       Glyphs
                     </h3>
                     <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                       {CHAR_SET.length}
                     </span>
                  </div>
                  <CharacterGrid 
                    selectedChar={currentChar} 
                    onSelect={handleSelectChar}
                    fontMap={fontMap}
                  />
               </div>
               
               <div className="text-xs text-gray-400 text-center px-4">
                  Changes save automatically.
               </div>
            </div>

            {/* Right: Canvas */}
            <div className="w-full lg:flex-1 order-1 lg:order-2 flex flex-col items-center">
              <DrawingPad 
                char={currentChar} 
                onSave={handleSaveStrokes}
                existingStrokes={fontMap[currentChar]?.strokes}
              />
              
              {/* Minimal Nav Controls */}
              <div className="flex items-center gap-8 mt-8">
                <button 
                  onClick={handlePrev}
                  disabled={selectedCharIndex === 0}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex flex-col items-center min-w-[80px]">
                  <span className="text-xl font-bold text-black">{currentChar}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {selectedCharIndex + 1} / {CHAR_SET.length}
                  </span>
                </div>

                <button 
                  onClick={handleNext}
                  disabled={selectedCharIndex === CHAR_SET.length - 1}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed shadow-md transition-all"
                >
                   <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {currentTab === AppTab.PREVIEW && (
          <PreviewArea 
            fontMap={fontMap} 
            letterSpacing={letterSpacing} 
            setLetterSpacing={setLetterSpacing}
          />
        )}

        {currentTab === AppTab.EXPORT && (
          <div className="max-w-2xl mx-auto space-y-8 pt-4">
            {/* Hero Export Card */}
            <div className="geist-card p-10 text-center relative overflow-hidden">
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-gray-50 border border-gray-100 text-black rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Sparkles size={24} />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-black mb-3">Ready to Ship</h2>
                    <p className="text-gray-500 mb-8 text-sm leading-relaxed max-w-sm mx-auto">
                        Compile your glyphs into a standard OpenType font file. Compatible with all major design software.
                    </p>
                    
                    <button 
                    onClick={() => setIsExportModalOpen(true)}
                    className="geist-button px-8 py-3 text-sm flex items-center justify-center gap-2 mx-auto"
                    >
                        <Download size={16} /> 
                        <span>Download .OTF</span>
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 px-1">Documentation</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Desktop */}
                <div className="geist-card p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <Monitor size={20} className="text-gray-900"/>
                        <h4 className="font-bold text-sm text-gray-900">Desktop</h4>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex gap-2 text-xs text-gray-600 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1 shrink-0"></span>
                            <span>Open the <strong>.otf</strong> file.</span>
                        </li>
                         <li className="flex gap-2 text-xs text-gray-600 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1 shrink-0"></span>
                            <span>Click <strong>Install</strong>.</span>
                        </li>
                    </ul>
                </div>

                {/* Mobile */}
                <div className="geist-card p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                         <Smartphone size={20} className="text-gray-900"/>
                         <h4 className="font-bold text-sm text-gray-900">Mobile</h4>
                    </div>
                     <ul className="space-y-3">
                        <li className="flex gap-2 text-xs text-gray-600 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1 shrink-0"></span>
                            <span><strong>iOS:</strong> Use <em>iFont</em> to install.</span>
                        </li>
                         <li className="flex gap-2 text-xs text-gray-600 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1 shrink-0"></span>
                            <span><strong>Android:</strong> Use <em>zFont 3</em>.</span>
                        </li>
                    </ul>
                </div>
                </div>
            </div>
          </div>
        )}
      </main>

      {/* Export Modal */}
      {isExportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm transition-opacity" onClick={() => setIsExportModalOpen(false)}></div>
              <div className="relative bg-white rounded-lg border border-gray-200 w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                  <button 
                    onClick={() => setIsExportModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                  >
                      <X size={16} />
                  </button>

                  <h3 className="text-lg font-bold text-black mb-1">Export Settings</h3>
                  <p className="text-xs text-gray-500 mb-6">Configure your font metadata.</p>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Font Name</label>
                          <input 
                            type="text" 
                            value={fontName}
                            onChange={(e) => setFontName(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm font-medium"
                            autoFocus
                          />
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded border border-gray-100 flex items-center gap-2">
                           <CheckCircle2 size={16} className="text-black shrink-0" />
                           <span className="text-xs text-gray-600">Letter Spacing: <strong>{letterSpacing > 0 ? '+' : ''}{letterSpacing}</strong></span>
                      </div>

                      <button 
                        onClick={handleExport}
                        className="geist-button w-full py-2.5 text-sm"
                      >
                          Download File
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;