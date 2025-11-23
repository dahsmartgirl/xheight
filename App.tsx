import React, { useState, useEffect } from 'react';
import { CHAR_SET, FontMap, Stroke } from './types';
import DrawingPad from './components/DrawingPad';
import CharacterGrid from './components/CharacterGrid';
import PreviewArea from './components/PreviewArea';
import { generateFont, generateFontFamilyZip, downloadFile, centerStrokes } from './utils/svgHelpers';
import { Download, X, CheckCircle2, FileArchive, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

type ViewMode = 'CANVAS' | 'PREVIEW';

const App: React.FC = () => {
  // --- STATE ---
  const [viewMode, setViewMode] = useState<ViewMode>('CANVAS');
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
    // Using default options for regular font
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
      
      {/* Header */}
      <header className="h-[54px] shrink-0 border-b border-thin border-[#D9D9D9] flex items-center justify-between px-4 lg:px-[24px] bg-white z-50 relative">
        <div className="flex items-center gap-4">
             {/* Mobile Sidebar Toggle */}
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu className="text-black" size={20} />
            </button>
            
            {/* Brand Logo - SVG */}
            <div className="flex items-center select-none">
                <svg width="83" height="25" viewBox="0 0 83 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[16px] w-auto lg:h-[20px] block shrink-0 overflow-visible">
                    <path d="M8.18462 9.47875V12.2296L2.72821 17.7314H0V14.9805L5.45641 9.47875H8.18462ZM17.4605 14.9805V17.7314H14.7323L9.2759 12.2296V9.47875H12.0041L17.4605 14.9805ZM8.18462 5.62752V8.3784H5.45641L0 2.87664V0.125756H2.72821L8.18462 5.62752ZM17.4605 2.87664L12.0041 8.3784H9.2759V5.62752L14.7323 0.125756H17.4605V2.87664Z" fill="#ED0C14"/>
                    <path d="M18.3585 13.5563C18.2088 13.5563 18.134 13.4809 18.134 13.33C18.134 12.894 18.1756 12.5419 18.2587 12.2736C18.3419 12.0054 18.4666 11.8628 18.6329 11.8461C19.4976 11.7119 20.3872 11.5862 21.3018 11.4688C22.2331 11.3347 23.131 11.2257 23.9957 11.1419C24.1288 11.1419 24.2119 11.1754 24.2452 11.2425C24.2951 11.2928 24.32 11.3598 24.32 11.4437C24.32 11.8964 24.2867 12.2401 24.2202 12.4748C24.1537 12.6928 24.0207 12.8186 23.8211 12.8521C22.973 12.9695 22.0668 13.0952 21.1023 13.2294C20.1544 13.3635 19.2398 13.4725 18.3585 13.5563Z" fill="black"/>
                    <path d="M28.0208 17.8068C27.6882 17.8068 27.5219 17.6979 27.5219 17.4799C27.5219 17.2954 27.7132 17.1362 28.0956 17.002C28.3451 16.9182 28.5696 16.826 28.7691 16.7254C28.9853 16.608 29.0934 16.3732 29.0934 16.0211V3.77264C29.0934 3.31992 29.0269 2.92589 28.8938 2.59054C28.7774 2.2552 28.5031 2.04561 28.0707 1.96177C27.9044 1.92824 27.8213 1.80248 27.8213 1.58451C27.8213 1.40007 27.8961 1.2827 28.0458 1.23239C28.3783 1.14856 28.7608 1.03957 29.1932 0.905433C29.6421 0.754527 30.0745 0.603622 30.4902 0.452716C30.9226 0.285044 31.2718 0.15929 31.5379 0.0754532C31.6543 0.0251511 31.7374 0 31.7873 0C31.8871 0 31.9536 0.0251511 31.9868 0.0754532C32.0201 0.125754 32.0367 0.18444 32.0367 0.251509C32.0367 0.352113 32.0201 0.486252 31.9868 0.653924C31.9536 0.821597 31.9203 1.05634 31.8871 1.35815C31.8704 1.64319 31.8621 2.03722 31.8621 2.54024V7.89738C31.8621 8.09859 31.8704 8.26626 31.8871 8.4004C31.9037 8.51777 31.9453 8.60999 32.0118 8.67706C32.2612 8.47586 32.5689 8.2495 32.9347 7.99799C33.3005 7.72971 33.7163 7.50335 34.1819 7.31891C34.6475 7.11771 35.1547 7.0171 35.7034 7.0171C36.5681 7.0171 37.2832 7.33568 37.8486 7.97284C38.4306 8.60999 38.7216 9.46513 38.7216 10.5382V15.9457C38.7216 16.2978 38.8214 16.5409 39.0209 16.6751C39.2205 16.8092 39.4367 16.9182 39.6695 17.002C39.8524 17.0691 39.9854 17.1362 40.0686 17.2032C40.1683 17.2703 40.2182 17.3625 40.2182 17.4799C40.2182 17.6979 40.0436 17.8068 39.6944 17.8068C39.3119 17.8068 39.0043 17.7901 38.7715 17.7565C38.5553 17.7398 38.3475 17.723 38.1479 17.7062C37.9484 17.6895 37.674 17.6811 37.3248 17.6811C36.9922 17.6811 36.7261 17.6895 36.5266 17.7062C36.3437 17.723 36.1524 17.7398 35.9529 17.7565C35.7533 17.7901 35.4623 17.8068 35.0798 17.8068C34.714 17.8068 34.5311 17.6895 34.5311 17.4547C34.5311 17.3374 34.581 17.2451 34.6808 17.1781C34.7805 17.111 34.9052 17.0523 35.0549 17.002C35.2877 16.9349 35.4956 16.826 35.6785 16.6751C35.8614 16.5241 35.9529 16.2726 35.9529 15.9205V10.9155C35.9529 10.5298 35.8614 10.1861 35.6785 9.88431C35.4956 9.56573 35.2628 9.31422 34.9801 9.12978C34.714 8.94534 34.423 8.85312 34.107 8.85312C33.841 8.85312 33.5417 8.89504 33.2091 8.97887C32.8765 9.06271 32.5772 9.20523 32.3111 9.40644C32.1282 9.54058 32.0035 9.69148 31.937 9.85915C31.8871 10.0101 31.8621 10.2616 31.8621 10.6137V15.996C31.8788 16.3313 31.9702 16.5661 32.1365 16.7002C32.3194 16.8176 32.519 16.9182 32.7352 17.002C32.9014 17.0523 33.0262 17.111 33.1093 17.1781C33.2091 17.2451 33.259 17.3374 33.259 17.4547C33.259 17.6895 33.1093 17.8068 32.81 17.8068C32.4774 17.8068 32.1864 17.7901 31.937 17.7565C31.6875 17.7398 31.4464 17.723 31.2136 17.7062C30.9974 17.6895 30.7397 17.6811 30.4403 17.6811C30.1576 17.6811 29.8916 17.6895 29.6421 17.7062C29.4093 17.723 29.1599 17.7398 28.8938 17.7565C28.6444 17.7901 28.3534 17.8068 28.0208 17.8068Z" fill="black"/><path d="M44.2322 18.0835C43.3176 18.0835 42.5111 17.8488 41.8127 17.3793C41.1143 16.9098 40.5655 16.2643 40.1664 15.4427C39.7673 14.6043 39.5677 13.6569 39.5677 12.6006C39.5677 11.5778 39.8006 10.6472 40.2662 9.80885C40.7484 8.95372 41.3886 8.27465 42.1868 7.77163C42.985 7.26861 43.858 7.0171 44.8059 7.0171C45.5043 7.0171 46.1279 7.16801 46.6767 7.46982C47.2254 7.75486 47.6578 8.15728 47.9737 8.67706C48.3063 9.18008 48.4726 9.75017 48.4726 10.3873C48.4726 10.9909 48.2149 11.2928 47.6994 11.2928H42.6358C42.403 11.2928 42.2284 11.3598 42.112 11.494C42.0122 11.6113 41.9623 11.8377 41.9623 12.173C41.9623 12.8773 42.112 13.5144 42.4113 14.0845C42.7273 14.6546 43.143 15.1073 43.6585 15.4427C44.174 15.778 44.7643 15.9457 45.4295 15.9457C45.9117 15.9457 46.3524 15.8535 46.7515 15.669C47.1672 15.4678 47.558 15.1995 47.9239 14.8642C47.9904 14.8139 48.0486 14.772 48.0985 14.7384C48.1483 14.6881 48.1982 14.663 48.2481 14.663C48.4144 14.663 48.4976 14.7636 48.4976 14.9648C48.4976 15.1995 48.3978 15.4846 48.1982 15.8199C47.9987 16.2056 47.7077 16.5744 47.3252 16.9266C46.9594 17.2787 46.5104 17.5553 45.9782 17.7565C45.4461 17.9745 44.8641 18.0835 44.2322 18.0835ZM42.6358 10.3119H44.4068C44.8392 10.3119 45.1634 10.3035 45.3796 10.2867C45.5958 10.27 45.8036 10.2364 46.0032 10.1861C46.0863 10.1693 46.1445 10.1023 46.1778 9.98491C46.2111 9.85077 46.2277 9.69987 46.2277 9.53219C46.2277 9.07948 46.0531 8.70221 45.7039 8.4004C45.3713 8.08182 44.9556 7.92254 44.4567 7.92254C44.1075 7.92254 43.7666 8.03152 43.434 8.2495C43.1014 8.4507 42.827 8.7106 42.6109 9.02917C42.3947 9.34775 42.2949 9.67472 42.3115 10.0101C42.3115 10.2113 42.4196 10.3119 42.6358 10.3119Z" fill="black"/><path d="M48.3779 17.8068C48.2449 17.8068 48.1368 17.7817 48.0536 17.7314C47.9705 17.6643 47.9289 17.5805 47.9289 17.4799C47.9289 17.3457 47.9788 17.2451 48.0786 17.1781C48.1784 17.111 48.2948 17.0607 48.4278 17.0272C48.8269 16.9266 49.1096 16.8176 49.2759 16.7002C49.4588 16.5828 49.5503 16.3816 49.5503 16.0966V10.6388C49.5503 10.1023 49.4671 9.69987 49.3008 9.43159C49.1345 9.16331 48.8518 8.99564 48.4527 8.92857C48.3696 8.9118 48.3031 8.86989 48.2532 8.80282C48.2033 8.71898 48.1784 8.62676 48.1784 8.52616C48.1784 8.29142 48.2698 8.16566 48.4527 8.14889C49.2509 7.98122 49.941 7.75486 50.523 7.46982C51.1217 7.16801 51.579 6.93327 51.895 6.76559C52.1278 6.64822 52.2774 6.58954 52.3439 6.58954C52.5269 6.58954 52.6183 6.67337 52.6183 6.84105C52.6017 7.07579 52.5684 7.40275 52.5185 7.82193C52.4687 8.22435 52.4188 8.6603 52.3689 9.12978C52.3356 9.5825 52.319 10.0101 52.319 10.4125V16.0714C52.319 16.3229 52.4104 16.5158 52.5934 16.6499C52.7763 16.784 53.0673 16.9098 53.4664 17.0272C53.5994 17.0775 53.7158 17.1362 53.8156 17.2032C53.9154 17.2535 53.9653 17.3457 53.9653 17.4799C53.9653 17.6811 53.8239 17.7817 53.5412 17.7817C53.2253 17.7817 52.9176 17.7733 52.6183 17.7565C52.3356 17.7398 52.0529 17.723 51.7702 17.7062C51.5042 17.6895 51.2215 17.6811 50.9221 17.6811C50.6395 17.6811 50.3651 17.6895 50.099 17.7062C49.8329 17.723 49.5586 17.7398 49.2759 17.7565C49.0098 17.7901 48.7105 17.8068 48.3779 17.8068ZM50.8723 5.13078C50.39 5.13078 49.9826 4.96311 49.65 4.62777C49.3174 4.29242 49.1512 3.89001 49.1512 3.42052C49.1512 2.90074 49.3174 2.47317 49.65 2.13783C49.9826 1.80248 50.39 1.63481 50.8723 1.63481C51.3711 1.63481 51.7869 1.80248 52.1194 2.13783C52.452 2.47317 52.6183 2.90074 52.6183 3.42052C52.6183 3.89001 52.452 4.29242 52.1194 4.62777C51.7869 4.96311 51.3711 5.13078 50.8723 5.13078Z" fill="black"/>
                </svg>
            </div>
        </div>

        {/* Download Button */}
        <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-[6px] bg-[#14110F] text-white px-3 py-1.5 lg:px-[16px] lg:py-[8px] rounded-[30px] transition-colors hover:bg-black"
        >
            <div className="w-[14px] h-[14px] relative flex items-center justify-center">
                 <Download size={12} strokeWidth={2.5} />
            </div>
            <span className="text-[12px] lg:text-[13px] font-medium hidden sm:inline">Download font</span>
            <span className="text-[12px] font-medium sm:hidden">Download</span>
        </button>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Sidebar */}
        <aside className={`
            fixed inset-y-0 left-0 z-[60] w-[260px] bg-white transform transition-transform duration-300 ease-in-out border-r border-[#D9D9D9] flex flex-col gap-[20px] p-5
            lg:relative lg:translate-x-0 lg:w-[280px] lg:p-[24px] lg:z-0
            ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'}
        `}>
            {/* Close Button Mobile */}
            <button className="absolute top-4 right-4 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                <X className="text-gray-500" size={18} />
            </button>

            {/* Font Name Section */}
            <div className="flex flex-col gap-[8px] w-full mt-10 lg:mt-0">
                <label className="text-[13px] font-medium text-black leading-tight">
                    Font name
                </label>
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
                 
                 {/* Scrollable Grid */}
                 <div className="flex-1 overflow-y-auto pr-2 pb-10 scrollbar-thin px-3 pt-3">
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
            <div className="fixed inset-0 bg-black/20 z-[55] lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {/* Main Content Area - Scaled Layout Fix: w-full instead of max-w */}
        <main className="flex-1 flex flex-col gap-[16px] lg:gap-[24px] p-4 lg:p-[24px] lg:pl-[32px] bg-white overflow-hidden w-full">
             
             {/* Top Control Bar */}
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 shrink-0">
                 
                 {/* Canvas/Preview Toggle Pill */}
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

                 {/* Progress Indicator (Zen Mode removed) */}
                 <div className="flex items-center gap-[12px] self-end sm:self-auto">
                      <div className="flex items-center gap-3 pr-2 pl-1.5 py-1.5 rounded-full border border-transparent transition-all">
                           
                           {/* Progress Indicator */}
                           <div className="relative w-[28px] h-[28px] rounded-full flex items-center justify-center shadow-inner bg-white">
                               <div 
                                 className="absolute inset-0 rounded-full"
                                 style={{
                                     background: `conic-gradient(#ED0C14 ${progressPercent}%, #F2F2F2 ${progressPercent}% 100%)`
                                 }}
                               />
                               <div className="absolute inset-[3px] bg-white rounded-full flex items-center justify-center">
                                  <span className="text-[8px] font-bold text-gray-900">{progressPercent}%</span>
                               </div>
                           </div>
                           
                      </div>
                 </div>
             </div>

             {/* Main Canvas Container */}
             <div className="flex-1 w-full relative min-h-0 flex flex-col">
                {viewMode === 'CANVAS' ? (
                    <div className="w-full h-full relative flex flex-col">
                        <div className="flex-1 relative w-full h-full max-h-full">
                            <DrawingPad 
                                char={currentChar}
                                onSave={handleSaveStrokes}
                                existingStrokes={fontMap[currentChar]?.strokes}
                            />
                            
                            {/* Floating Navigation Arrows */}
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