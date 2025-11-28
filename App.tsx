
import React, { useState, useEffect } from 'react';
import { CHAR_SET, FontMap, Stroke } from './types';
import DrawingPad from './components/DrawingPad';
import CharacterGrid from './components/CharacterGrid';
import PreviewArea from './components/PreviewArea';
import LandingPage from './components/LandingPage';
import { generateFont, generateFontFamilyZip, downloadFile, centerStrokes } from './utils/svgHelpers';
// @ts-ignore
import confetti from 'canvas-confetti';
import { Download, X, FileArchive, ChevronLeft, ChevronRight, Menu, RotateCcw, Sun, Moon, Check } from 'lucide-react';

type ViewMode = 'CANVAS' | 'PREVIEW';
type AppView = 'LANDING' | 'APP';

const App: React.FC = () => {
  // --- STATE ---
  const [appView, setAppView] = useState<AppView>('LANDING');

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

  // 'clean' = no unsaved changes (hidden icon)
  // 'dirty' = user typed something (show clickable check)
  // 'saved' = user clicked check (show success animation)
  const [nameInputState, setNameInputState] = useState<'clean' | 'dirty' | 'saved'>('clean');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Reset Confirmation State
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Theme State - Simple Light/Dark toggle
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    // Default to system preference if not set
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const currentChar = CHAR_SET[selectedCharIndex];

  // --- PERSISTENCE & THEME EFFECTS ---
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

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- ACTIONS ---

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const triggerConfetti = () => {
    const duration = 1000;
    const end = Date.now() + duration;

    (function frame() {
      // Launch a few confetti from the left edge
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ED0C14', '#262626', '#D9D9D9']
      });
      // and a few from the right edge
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ED0C14', '#262626', '#D9D9D9']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const handleSaveStrokes = (strokes: Stroke[], width: number, height: number) => {
    // Check if this specific character was already done before this save
    const wasCurrentCharDone = fontMap[currentChar] && fontMap[currentChar].strokes.length > 0;
    const isNowDone = strokes.length > 0;

    // Check how many OTHER characters are done
    const otherCharsDoneCount = CHAR_SET.filter(c => c !== currentChar && fontMap[c] && fontMap[c].strokes.length > 0).length;

    // If the current one is now done, and all others were already done, we have a full set!
    if (isNowDone && !wasCurrentCharDone && otherCharsDoneCount === CHAR_SET.length - 1) {
      triggerConfetti();
    }

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

  const handleResetTrigger = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setResetSuccess(true);
    // Delay to show feedback before clearing
    setTimeout(() => {
      localStorage.removeItem('scriptsmith_fontMap');
      localStorage.removeItem('scriptsmith_selectedIndex');

      setFontMap({});
      setSelectedCharIndex(0);

      setResetSuccess(false);
      setShowResetConfirm(false);
    }, 500);
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  const getExportName = () => {
    return fontName.trim() || "myhandwriting";
  };

  const handleExport = () => {
    centerAllGlyphs();
    const safeName = getExportName().replace(/[^a-z0-9]/gi, '_');
    // Using default options for regular font, ignore preview letterSpacing (pass 0)
    const fontBuffer = generateFont(safeName, fontMap, 0);
    downloadFile(fontBuffer, `${safeName}.ttf`, 'font/ttf');
    setIsExportModalOpen(false);
  };

  const handleExportFamily = async () => {
    centerAllGlyphs();
    const safeName = getExportName().replace(/[^a-z0-9]/gi, '_');
    // Ignore preview letterSpacing (pass 0)
    const zipBlob = await generateFontFamilyZip(safeName, fontMap, 0);

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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFontName(e.target.value);
    setNameInputState('dirty');
  };

  const handleNameConfirm = () => {
    setNameInputState('saved');
    setTimeout(() => {
      setNameInputState('clean');
    }, 1500);
  };

  const completedCount = CHAR_SET.filter(c => fontMap[c] && fontMap[c].strokes.length > 0).length;
  const progressPercent = Math.round((completedCount / CHAR_SET.length) * 100);

  if (appView === 'LANDING') {
    return (
      <LandingPage
        onEnterApp={() => setAppView('APP')}
        toggleTheme={toggleTheme}
        theme={theme}
      />
    );
  }

  return (
    <div className="w-full h-[100dvh] bg-white dark:bg-neutral-950 flex flex-col font-['Inter'] overflow-hidden">

      {/* Header */}
      <header className="h-[54px] shrink-0 border-b border-thin border-[#D9D9D9] dark:border-neutral-800 flex items-center justify-between px-4 lg:px-[24px] bg-white dark:bg-neutral-950 z-50 relative overflow-visible">
        <div className="flex items-center gap-4 overflow-visible shrink-0">
          {/* Mobile Sidebar Toggle */}
          <button className="lg:hidden text-black dark:text-white" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={20} />
          </button>

          {/* Brand Logo - Click to go back to landing page */}
          <div
            onClick={() => setAppView('LANDING')}
            className="flex items-center select-none overflow-visible shrink-0 cursor-pointer hover:opacity-80 transition-opacity text-black dark:text-white"
            title="Back to Home"
          >
            <div className="overflow-visible flex items-center shrink-0">
              <svg
                width="83"
                height="25"
                viewBox="0 0 83 25"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-auto h-[16px] lg:h-[20px] block overflow-visible"
              >
                <path d="M8.18462 9.47875V12.2296L2.72821 17.7314H0V14.9805L5.45641 9.47875H8.18462ZM17.4605 14.9805V17.7314H14.7323L9.2759 12.2296V9.47875H12.0041L17.4605 14.9805ZM8.18462 5.62752V8.3784H5.45641L0 2.87664V0.125756H2.72821L8.18462 5.62752ZM17.4605 2.87664L12.0041 8.3784H9.2759V5.62752L14.7323 0.125756H17.4605V2.87664Z" fill="#ED0C14" />
                <path d="M18.3585 13.5563C18.2088 13.5563 18.134 13.4809 18.134 13.33C18.134 12.894 18.1756 12.5419 18.2587 12.2736C18.3419 12.0054 18.4666 11.8628 18.6329 11.8461C19.4976 11.7119 20.3872 11.5862 21.3018 11.4688C22.2331 11.3347 23.131 11.2257 23.9957 11.1419C24.1288 11.1419 24.2119 11.1754 24.2452 11.2425C24.2951 11.2928 24.32 11.3598 24.32 11.4437C24.32 11.8964 24.2867 12.2401 24.2202 12.4748C24.1537 12.6928 24.0207 12.8186 23.8211 12.8521C22.973 12.9695 22.0668 13.0952 21.1023 13.2294C20.1544 13.3635 19.2398 13.4725 18.3585 13.5563Z" className="fill-current" />
                <path d="M28.0208 17.8068C27.6882 17.8068 27.5219 17.6979 27.5219 17.4799C27.5219 17.2954 27.7132 17.1362 28.0956 17.002C28.3451 16.9182 28.5696 16.826 28.7691 16.7254C28.9853 16.608 29.0934 16.3732 29.0934 16.0211V3.77264C29.0934 3.31992 29.0269 2.92589 28.8938 2.59054C28.7774 2.2552 28.5031 2.04561 28.0707 1.96177C27.9044 1.92824 27.8213 1.80248 27.8213 1.58451C27.8213 1.40007 27.8961 1.2827 28.0458 1.23239C28.3783 1.14856 28.7608 1.03957 29.1932 0.905433C29.6421 0.754527 30.0745 0.603622 30.4902 0.452716C30.9226 0.285044 31.2718 0.15929 31.5379 0.0754532C31.6543 0.0251511 31.7374 0 31.7873 0C31.8871 0 31.9536 0.0251511 31.9868 0.0754532C32.0201 0.125754 32.0367 0.18444 32.0367 0.251509C32.0367 0.352113 32.0201 0.486252 31.9868 0.653924C31.9536 0.821597 31.9203 1.05634 31.8871 1.35815C31.8704 1.64319 31.8621 2.03722 31.8621 2.54024V7.89738C31.8621 8.09859 31.8704 8.26626 31.8871 8.4004C31.9037 8.51777 31.9453 8.60999 32.0118 8.67706C32.2612 8.47586 32.5689 8.2495 32.9347 7.99799C33.3005 7.72971 33.7163 7.50335 34.1819 7.31891C34.6475 7.11771 35.1547 7.0171 35.7034 7.0171C36.5681 7.0171 37.2832 7.33568 37.8486 7.97284C38.4306 8.60999 38.7216 9.46513 38.7216 10.5382V15.9457C38.7216 16.2978 38.8214 16.5409 39.0209 16.6751C39.2205 16.8092 39.4367 16.9182 39.6695 17.002C39.8524 17.0691 39.9854 17.1362 40.0686 17.2032C40.1683 17.2703 40.2182 17.3625 40.2182 17.4799C40.2182 17.6979 40.0436 17.8068 39.6944 17.8068C39.3119 17.8068 39.0043 17.7901 38.7715 17.7565C38.5553 17.7398 38.3475 17.723 38.1479 17.7062C37.9484 17.6895 37.674 17.6811 37.3248 17.6811C36.9922 17.6811 36.7261 17.6895 36.5266 17.7062C36.3437 17.723 36.1524 17.7398 35.9529 17.7565C35.7533 17.7901 35.4623 17.8068 35.0798 17.8068C34.714 17.8068 34.5311 17.6895 34.5311 17.4547C34.5311 17.3374 34.581 17.2451 34.6808 17.1781C34.7805 17.111 34.9052 17.0523 35.0549 17.002C35.2877 16.9349 35.4956 16.826 35.6785 16.6751C35.8614 16.5241 35.9529 16.2726 35.9529 15.9205V10.9155C35.9529 10.5298 35.8614 10.1861 35.6785 9.88431C35.4956 9.56573 35.2628 9.31422 34.9801 9.12978C34.714 8.94534 34.423 8.85312 34.107 8.85312C33.841 8.85312 33.5417 8.89504 33.2091 8.97887C32.8765 9.06271 32.5772 9.20523 32.3111 9.40644C32.1282 9.54058 32.0035 9.69148 31.937 9.85915C31.8871 10.0101 31.8621 10.2616 31.8621 10.6137V15.996C31.8788 16.3313 31.9702 16.5661 32.1365 16.7002C32.3194 16.8176 32.519 16.9182 32.7352 17.002C32.9014 17.0523 33.0262 17.111 33.1093 17.1781C33.2091 17.2451 33.259 17.3374 33.259 17.4547C33.259 17.6895 33.1093 17.8068 32.81 17.8068C32.4774 17.8068 32.1864 17.7901 31.937 17.7565C31.6875 17.7398 31.4464 17.723 31.2136 17.7062C30.9974 17.6895 30.7397 17.6811 30.4403 17.6811C30.1576 17.6811 29.8916 17.6895 29.6421 17.7062C29.4093 17.723 29.1599 17.7398 28.8938 17.7565C28.6444 17.7901 28.3534 17.8068 28.0208 17.8068Z" className="fill-current" />
                <path d="M44.2322 18.0835C43.3176 18.0835 42.5111 17.8488 41.8127 17.3793C41.1143 16.9098 40.5655 16.2643 40.1664 15.4427C39.7673 14.6043 39.5677 13.6569 39.5677 12.6006C39.5677 11.5778 39.8006 10.6472 40.2662 9.80885C40.7484 8.95372 41.3886 8.27465 42.1868 7.77163C42.985 7.26861 43.858 7.0171 44.8059 7.0171C45.5043 7.0171 46.1279 7.16801 46.6767 7.46982C47.2254 7.75486 47.6578 8.15728 47.9737 8.67706C48.3063 9.18008 48.4726 9.75017 48.4726 10.3873C48.4726 10.9909 48.2149 11.2928 47.6994 11.2928H42.6358C42.403 11.2928 42.2284 11.3598 42.112 11.494C42.0122 11.6113 41.9623 11.8377 41.9623 12.173C41.9623 12.8773 42.112 13.5144 42.4113 14.0845C42.7273 14.6546 43.143 15.1073 43.6585 15.4427C44.174 15.778 44.7643 15.9457 45.4295 15.9457C45.9117 15.9457 46.3524 15.8535 46.7515 15.669C47.1672 15.4678 47.558 15.1995 47.9239 14.8642C47.9904 14.8139 48.0486 14.772 48.0985 14.7384C48.1483 14.6881 48.1982 14.663 48.2481 14.663C48.4144 14.663 48.4976 14.7636 48.4976 14.9648C48.4976 15.1995 48.3978 15.4846 48.1982 15.8199C47.9987 16.2056 47.7077 16.5744 47.3252 16.9266C46.9594 17.2787 46.5104 17.5553 45.9782 17.7565C45.4461 17.9745 44.8641 18.0835 44.2322 18.0835ZM42.6358 10.3119H44.4068C44.8392 10.3119 45.1634 10.3035 45.3796 10.2867C45.5958 10.27 45.8036 10.2364 46.0032 10.1861C46.0863 10.1693 46.1445 10.1023 46.1778 9.98491C46.2111 9.85077 46.2277 9.69987 46.2277 9.53219C46.2277 9.07948 46.0531 8.70221 45.7039 8.4004C45.3713 8.08182 44.9556 7.92254 44.4567 7.92254C44.1075 7.92254 43.7666 8.03152 43.434 8.2495C43.1014 8.4507 42.827 8.7106 42.6109 9.02917C42.3947 9.34775 42.2949 9.67472 42.3115 10.0101C42.3115 10.2113 42.4196 10.3119 42.6358 10.3119Z" className="fill-current" />
                <path d="M48.3779 17.8068C48.2449 17.8068 48.1368 17.7817 48.0536 17.7314C47.9705 17.6643 47.9289 17.5805 47.9289 17.4799C47.9289 17.3457 47.9788 17.2451 48.0786 17.1781C48.1784 17.111 48.2948 17.0607 48.4278 17.0272C48.8269 16.9266 49.1096 16.8176 49.2759 16.7002C49.4588 16.5828 49.5503 16.3816 49.5503 16.0966V10.6388C49.5503 10.1023 49.4671 9.69987 49.3008 9.43159C49.1345 9.16331 48.8518 8.99564 48.4527 8.92857C48.3696 8.9118 48.3031 8.86989 48.2532 8.80282C48.2033 8.71898 48.1784 8.62676 48.1784 8.52616C48.1784 8.29142 48.2698 8.16566 48.4527 8.14889C49.2509 7.98122 49.941 7.75486 50.523 7.46982C51.1217 7.16801 51.579 6.93327 51.895 6.76559C52.1278 6.64822 52.2774 6.58954 52.3439 6.58954C52.5269 6.58954 52.6183 6.67337 52.6183 6.84105C52.6017 7.07579 52.5684 7.40275 52.5185 7.82193C52.4687 8.22435 52.4188 8.6603 52.3689 9.12978C52.3356 9.5825 52.319 10.0101 52.319 10.4125V16.0714C52.319 16.3229 52.4104 16.5158 52.5934 16.6499C52.7763 16.784 53.0673 16.9098 53.4664 17.0272C53.5994 17.0775 53.7158 17.1362 53.8156 17.2032C53.9154 17.2535 53.9653 17.3457 53.9653 17.4799C53.9653 17.6811 53.8239 17.7817 53.5412 17.7817C53.2253 17.7817 52.9176 17.7733 52.6183 17.7565C52.3356 17.7398 52.0529 17.723 51.7702 17.7062C51.5042 17.6895 51.2215 17.6811 50.9221 17.6811C50.6395 17.6811 50.3651 17.6895 50.099 17.7062C49.8329 17.723 49.5586 17.7398 49.2759 17.7565C49.0098 17.7901 48.7105 17.8068 48.3779 17.8068ZM50.8723 5.13078C50.39 5.13078 49.9826 4.96311 49.65 4.62777C49.3174 4.29242 49.1512 3.89001 49.1512 3.42052C49.1512 2.90074 49.3174 2.47317 49.65 2.13783C49.9826 1.80248 50.39 1.63481 50.8723 1.63481C51.3711 1.63481 51.7869 1.80248 52.1194 2.13783C52.452 2.47317 52.6183 2.90074 52.6183 3.42052C52.6183 3.89001 52.452 4.29242 52.1194 4.62777C51.7869 4.96311 51.3711 5.13078 50.8723 5.13078Z" className="fill-current" />
                <path d="M57.814 25C56.2509 25 55.0286 24.7401 54.1473 24.2203C53.2659 23.7005 52.8253 22.9879 52.8253 22.0825C52.8253 21.613 52.8835 21.219 52.9999 20.9004C53.1329 20.5986 53.3907 20.3135 53.7731 20.0453C54.0558 19.8273 54.3635 19.5842 54.696 19.3159C55.0286 19.0644 55.3363 18.8296 55.619 18.6117L56.7913 18.9135C56.176 19.2824 55.7187 19.6596 55.4194 20.0453C55.1201 20.4477 54.9704 20.9172 54.9704 21.4537C54.9704 22.1244 55.2531 22.6861 55.8185 23.1388C56.4005 23.5916 57.1322 23.8179 58.0135 23.8179C59.0944 23.8179 59.8926 23.5916 60.4081 23.1388C60.7573 22.837 61.0317 22.4765 61.2313 22.0573C61.4308 21.6382 61.5306 21.2106 61.5306 20.7746C61.5306 20.4561 61.4225 20.1962 61.2063 19.995C61.0068 19.8105 60.6576 19.6512 60.1587 19.5171C59.6598 19.3997 58.978 19.3075 58.1133 19.2404C56.4338 19.0895 55.2448 18.7961 54.5464 18.3602C53.8646 17.941 53.5237 17.3541 53.5237 16.5996C53.5237 16.4487 53.5653 16.2978 53.6484 16.1469C53.7482 15.9792 53.9228 15.8115 54.1722 15.6439C54.4715 15.4091 54.721 15.2163 54.9205 15.0654C55.1367 14.9145 55.3113 14.772 55.4443 14.6378C55.5774 14.5037 55.6772 14.3696 55.7437 14.2354L56.8412 14.6881C56.492 14.8055 56.201 14.9732 55.9682 15.1911C55.752 15.3924 55.6439 15.5768 55.6439 15.7445C55.6439 15.9289 55.7603 16.0966 55.9931 16.2475C56.2259 16.3816 56.5917 16.4906 57.0906 16.5744C57.5895 16.6583 58.263 16.7337 59.1111 16.8008C60.8238 16.9182 62.071 17.1865 62.8526 17.6056C63.6508 18.008 64.0499 18.6033 64.0499 19.3913C64.0499 20.0788 63.867 20.7495 63.5011 21.4034C63.1353 22.0741 62.653 22.6777 62.0544 23.2143C61.4558 23.7676 60.7906 24.2036 60.0589 24.5221C59.3272 24.8407 58.5789 25 57.814 25ZM58.1383 14.2103C58.687 14.2103 59.136 13.9085 59.4852 13.3048C59.8344 12.6844 60.009 11.888 60.009 10.9155C60.009 10.3454 59.9176 9.834 59.7346 9.38129C59.5684 8.92857 59.3355 8.57646 59.0362 8.32495C58.7369 8.05667 58.396 7.92254 58.0135 7.92254C57.6643 7.92254 57.3401 8.05667 57.0407 8.32495C56.758 8.59323 56.5336 8.95372 56.3673 9.40644C56.201 9.84239 56.1178 10.337 56.1178 10.8903C56.1178 11.5107 56.201 12.0724 56.3673 12.5755C56.5502 13.0785 56.7996 13.4809 57.1156 13.7827C57.4315 14.0677 57.7724 14.2103 58.1383 14.2103ZM57.9138 15.2414C57.1821 15.2414 56.4753 15.0654 55.7936 14.7133C55.1284 14.3444 54.5796 13.8581 54.1473 13.2545C53.7149 12.6341 53.4987 11.9383 53.4987 11.167C53.4987 10.3454 53.7232 9.62441 54.1722 9.00402C54.6212 8.36687 55.2115 7.87223 55.9432 7.52012C56.6749 7.15124 57.4565 6.9668 58.2879 6.9668C58.7868 6.9668 59.2524 7.03387 59.6848 7.16801C60.1171 7.28538 60.5744 7.38598 61.0567 7.46982C61.4059 7.55366 61.7218 7.61234 62.0045 7.64588C62.2872 7.67941 62.5948 7.69618 62.9274 7.69618C63.1602 7.69618 63.4097 7.68779 63.6757 7.67103C63.9584 7.63749 64.1663 7.62072 64.2993 7.62072C64.5488 7.62072 64.6735 7.7884 64.6735 8.12374C64.6735 8.37525 64.5737 8.62676 64.3742 8.87827C64.291 8.97887 64.1995 9.02917 64.0998 9.02917H63.4263C62.9939 9.02917 62.7196 9.09624 62.6032 9.23038C62.5699 9.28068 62.545 9.33937 62.5283 9.40644C62.5117 9.47351 62.4951 9.5825 62.4784 9.7334C62.4784 9.88431 62.4784 10.1107 62.4784 10.4125C62.4784 11.2844 62.2623 12.0892 61.8299 12.827C61.4142 13.548 60.8571 14.1348 60.1587 14.5875C59.4769 15.0235 58.7286 15.2414 57.9138 15.2414Z" className="fill-current" />
                <path d="M63.6892 17.8068C63.3566 17.8068 63.1903 17.6979 63.1903 17.4799C63.1903 17.2954 63.3815 17.1362 63.764 17.002C64.0134 16.9182 64.2379 16.826 64.4375 16.7254C64.6537 16.608 64.7617 16.3732 64.7617 16.0211V3.77264C64.7617 3.31992 64.6952 2.92589 64.5622 2.59054C64.4458 2.2552 64.1714 2.04561 63.7391 1.96177C63.5728 1.92824 63.4896 1.80248 63.4896 1.58451C63.4896 1.40007 63.5645 1.2827 63.7141 1.23239C64.0467 1.14856 64.4292 1.03957 64.8615 0.905433C65.3105 0.754527 65.7429 0.603622 66.1586 0.452716C66.591 0.285044 66.9402 0.15929 67.2062 0.0754532C67.3226 0.0251511 67.4058 0 67.4557 0C67.5554 0 67.6219 0.0251511 67.6552 0.0754532C67.6885 0.125754 67.7051 0.18444 67.7051 0.251509C67.7051 0.352113 67.6885 0.486252 67.6552 0.653924C67.6219 0.821597 67.5887 1.05634 67.5554 1.35815C67.5388 1.64319 67.5305 2.03722 67.5305 2.54024V7.89738C67.5305 8.09859 67.5388 8.26626 67.5554 8.4004C67.5721 8.51777 67.6136 8.60999 67.6801 8.67706C67.9296 8.47586 68.2372 8.2495 68.6031 7.99799C68.9689 7.72971 69.3846 7.50335 69.8502 7.31891C70.3159 7.11771 70.823 7.0171 71.3718 7.0171C72.2365 7.0171 72.9516 7.33568 73.5169 7.97284C74.099 8.60999 74.39 9.46513 74.39 10.5382V15.9457C74.39 16.2978 74.4898 16.5409 74.6893 16.6751C74.8888 16.8092 75.105 16.9182 75.3378 17.002C75.5208 17.0691 75.6538 17.1362 75.7369 17.2032C75.8367 17.2703 75.8866 17.3625 75.8866 17.4799C75.8866 17.6979 75.712 17.8068 75.3628 17.8068C74.9803 17.8068 74.6727 17.7901 74.4399 17.7565C74.2237 17.7398 74.0158 17.723 73.8163 17.7062C73.6167 17.6895 73.3423 17.6811 72.9931 17.6811C72.6606 17.6811 72.3945 17.6895 72.1949 17.7062C72.012 17.723 71.8208 17.7398 71.6212 17.7565C71.4217 17.7901 71.1307 17.8068 70.7482 17.8068C70.3824 17.8068 70.1994 17.6895 70.1994 17.4547C70.1994 17.3374 70.2493 17.2451 70.3491 17.1781C70.4489 17.111 70.5736 17.0523 70.7233 17.002C70.9561 16.9349 71.1639 16.826 71.3469 16.6751C71.5298 16.5241 71.6212 16.2726 71.6212 15.9205V10.9155C71.6212 10.5298 71.5298 10.1861 71.3469 9.88431C71.1639 9.56573 70.9311 9.31422 70.6484 9.12978C70.3824 8.94534 70.0914 8.85312 69.7754 8.85312C69.5093 8.85312 69.21 8.89504 68.8774 8.97887C68.5449 9.06271 68.2455 9.20523 67.9795 9.40644C67.7966 9.54058 67.6718 9.69148 67.6053 9.85915C67.5554 10.0101 67.5305 10.2616 67.5305 10.6137V15.996C67.5471 16.3313 67.6386 16.5661 67.8049 16.7002C67.9878 16.8176 68.1873 16.9182 68.4035 17.002C68.5698 17.0523 68.6945 17.111 68.7777 17.1781C68.8774 17.2451 68.9273 17.3374 68.9273 17.4547C68.9273 17.6895 68.7777 17.8068 68.4783 17.8068C68.1458 17.8068 67.8548 17.7901 67.6053 17.7565C67.3559 17.7398 67.1148 17.723 66.882 17.7062C66.6658 17.6895 66.408 17.6811 66.1087 17.6811C65.826 17.6811 65.5599 17.6895 65.3105 17.7062C65.0777 17.723 64.8283 17.7398 64.5622 17.7565C64.3128 17.7901 64.0218 17.8068 63.6892 17.8068Z" className="fill-current" />
                <path d="M79.5578 18.0835C78.56 18.0835 77.8034 17.8152 77.2879 17.2787C76.7724 16.7421 76.5147 15.9624 76.5147 14.9396V9.12978C76.5147 8.99564 76.4565 8.89504 76.3401 8.82797C76.2403 8.7609 76.0324 8.71898 75.7165 8.70221H75.4421C75.3423 8.70221 75.2592 8.62676 75.1927 8.47585C75.1261 8.30818 75.0929 8.14889 75.0929 7.99799C75.0929 7.96445 75.1012 7.92253 75.1178 7.87223C75.1511 7.80516 75.1927 7.76325 75.2425 7.74648C75.625 7.57881 76.0158 7.35245 76.4149 7.0674C76.814 6.76559 77.1881 6.46378 77.5374 6.16197C77.8866 5.84339 78.1776 5.57512 78.4104 5.35714C78.5268 5.27331 78.6182 5.19785 78.6848 5.13078C78.7679 5.06372 78.8594 5.03018 78.9591 5.03018C79.0922 5.03018 79.1919 5.06372 79.2585 5.13078C79.3416 5.18109 79.3665 5.29007 79.3333 5.45775L79.1836 6.84105C79.167 7.04225 79.2086 7.17639 79.3083 7.24346C79.4248 7.31053 79.5827 7.34406 79.7823 7.34406H82.7256C82.7755 7.34406 82.8254 7.40275 82.8753 7.52012C82.9252 7.63749 82.9501 7.75486 82.9501 7.87223C82.9501 8.09021 82.9169 8.29142 82.8503 8.47585C82.8005 8.6603 82.7339 8.75252 82.6508 8.75252H80.2811C79.8987 8.75252 79.6326 8.79443 79.483 8.87827C79.3499 8.96211 79.2834 9.13816 79.2834 9.40644V14.2354C79.2834 14.9732 79.4248 15.5349 79.7074 15.9205C79.9901 16.2894 80.3892 16.4738 80.9047 16.4738C81.3703 16.4738 81.7196 16.4319 81.9524 16.3481C82.2018 16.2643 82.4263 16.1636 82.6258 16.0463C82.6757 16.0127 82.7173 15.996 82.7506 15.996C82.8337 15.996 82.8919 16.0463 82.9252 16.1469C82.9751 16.2475 83 16.3565 83 16.4738C83 16.5577 82.8337 16.7337 82.5011 17.002C82.1852 17.2703 81.7611 17.5134 81.229 17.7314C80.7135 17.9661 80.1564 18.0835 79.5578 18.0835Z" className="fill-current" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Theme Switcher - Icon Only Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-full text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Download Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-[6px] bg-[#14110F] dark:bg-white text-white dark:text-black px-3 py-1.5 lg:px-[16px] lg:py-[8px] rounded-[30px] hover:bg-black dark:hover:bg-gray-200 overflow-visible shrink-0"
          >
            <div className="w-[14px] h-[14px] relative flex items-center justify-center">
              <Download size={12} strokeWidth={2.5} />
            </div>
            <span className="text-[12px] lg:text-[13px] font-medium hidden sm:inline">Download font</span>
            <span className="text-[12px] font-medium sm:hidden">Download</span>
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Sidebar */}
        <aside className={`
            fixed inset-y-0 left-0 z-[60] w-[260px] bg-white dark:bg-neutral-950 transform border-r border-[#D9D9D9] dark:border-neutral-800 flex flex-col gap-[20px] p-5
            lg:relative lg:translate-x-0 lg:w-[280px] lg:p-[24px] lg:z-0
            ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'}
        `}>
          {/* Close Button Mobile */}
          <button className="absolute top-4 right-4 lg:hidden text-black dark:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={18} />
          </button>

          {/* Font Name Section */}
          <div className="flex flex-col gap-[8px] w-full mt-10 lg:mt-0">
            <label className="text-[13px] font-medium text-black dark:text-white leading-tight">
              Font name
            </label>
            <div className="h-[40px] w-full px-[16px] py-[8px] rounded-[30px] outline outline-[0.5px] outline-[#D9D9D9] dark:outline-neutral-800 flex items-center focus-within:outline-gray-400 dark:focus-within:outline-neutral-600">
              <input
                type="text"
                value={fontName}
                onChange={handleNameChange}
                className="w-full h-full bg-transparent border-none outline-none text-[13px] font-normal text-black dark:text-white placeholder:text-[#7B7B7B] dark:placeholder:text-neutral-500"
                placeholder="myhandwriting"
              />
            </div>
          </div>

          {/* Glyphs Section */}
          <div className="flex flex-col gap-[16px] flex-1 overflow-hidden">
            <div className="h-[40px] relative w-full flex items-center justify-between pr-2 shrink-0">
              {showResetConfirm ? (
                /* Bubble Popup Animation */
                <div className="w-full h-full relative bg-[#FAFAFA] dark:bg-neutral-800 rounded-[30px] animate-in fade-in zoom-in-95 duration-200 origin-center scale-90">
                  <div className="absolute inset-0 flex items-center justify-start pl-[14px]">
                    <div className="text-black dark:text-white text-[14px] font-medium font-['Inter'] leading-[19.60px] whitespace-nowrap mr-[13px]">
                      Are you sure?
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={confirmReset}
                        className="pl-[9px] pr-[9px] pt-[6px] pb-[6px] bg-black dark:bg-white rounded-l-[30px] flex justify-center items-center gap-2.5 hover:opacity-80 transition-opacity min-w-[42px]"
                      >
                        {resetSuccess ? (
                          <Check size={14} strokeWidth={3} className="text-white dark:text-black animate-in zoom-in" />
                        ) : (
                          <div className="text-white dark:text-black text-[14px] font-medium font-['Inter'] leading-[19.60px]">Yes</div>
                        )}
                      </button>
                      <button
                        onClick={cancelReset}
                        className="pl-[12px] pr-[12px] pt-[6px] pb-[6px] bg-[rgba(255,29,37,0.10)] dark:bg-[rgba(255,29,37,0.20)] rounded-r-[30px] flex justify-center items-center gap-2.5 hover:bg-[rgba(255,29,37,0.20)] dark:hover:bg-[rgba(255,29,37,0.30)] transition-colors"
                      >
                        <div className="text-black dark:text-white text-[14px] font-medium font-['Inter'] leading-[19.60px]">No</div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-[13px] font-medium text-black dark:text-white leading-tight">Glyphs</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetTrigger}
                      className="text-gray-400 hover:text-red-600 p-2 relative z-50 cursor-pointer transition-transform hover:scale-110 active:scale-95 duration-200 ease-spring"
                      title="Reset All"
                      aria-label="Reset All Progress"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <div className="h-[24px] px-[10px] bg-[rgba(255,29,37,0.10)] dark:bg-[rgba(255,29,37,0.20)] rounded-[20px] flex items-center justify-center">
                      <span className="text-[#ED0C14] text-[12px] font-semibold">
                        {completedCount}/{CHAR_SET.length}
                      </span>
                    </div>
                  </div>
                </>
              )}
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

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col gap-[16px] lg:gap-[24px] p-4 lg:p-[24px] lg:pl-[32px] bg-white dark:bg-neutral-950 overflow-hidden w-full">

          {/* Top Control Bar */}
          <div className="flex flex-row items-center justify-between w-full gap-3 shrink-0">

            {/* Canvas/Preview Toggle Pill */}
            <div className="flex-1 sm:flex-none sm:w-[220px] h-[40px] p-[3px] bg-[#FAFAFA] dark:bg-neutral-900 rounded-[30px] flex relative shrink-0">
              <button
                onClick={() => setViewMode('CANVAS')}
                className={`relative z-10 flex-1 h-[34px] rounded-[26px] flex items-center justify-center text-[13px] font-medium ${viewMode === 'CANVAS' ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm' : 'text-gray-400 dark:text-neutral-500'}`}
              >
                Canvas
              </button>
              <button
                onClick={() => setViewMode('PREVIEW')}
                className={`relative z-10 flex-1 h-[34px] rounded-[26px] flex items-center justify-center text-[13px] font-medium ${viewMode === 'PREVIEW' ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm' : 'text-gray-400 dark:text-neutral-500'}`}
              >
                Preview
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-[12px] shrink-0">
              <div className="flex items-center gap-3 pr-2 pl-1.5 py-1.5 rounded-full border border-transparent">
                <div className="relative w-[28px] h-[28px] rounded-full flex items-center justify-center shadow-inner bg-white dark:bg-neutral-800">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(#ED0C14 ${progressPercent}%, ${theme === 'dark' ? '#262626' : '#F2F2F2'} ${progressPercent}% 100%)`
                    }}
                  />
                  <div className="absolute inset-[3px] bg-white dark:bg-neutral-900 rounded-full flex items-center justify-center">
                    <span className="text-[8px] font-bold text-gray-900 dark:text-white">{progressPercent}%</span>
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
                    darkMode={theme === 'dark'}
                  />

                  {/* Floating Navigation Arrows */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-8 lg:gap-[160px] pointer-events-none z-30">
                    <button
                      onClick={handlePrevChar}
                      disabled={selectedCharIndex === 0}
                      className="w-[56px] h-[56px] lg:w-[48px] lg:h-[48px] rounded-full bg-white dark:bg-neutral-800 shadow-lg flex items-center justify-center pointer-events-auto disabled:opacity-50"
                    >
                      <ChevronLeft size={20} className="text-black dark:text-white" strokeWidth={2.5} />
                    </button>

                    <button
                      onClick={handleNextChar}
                      disabled={selectedCharIndex === CHAR_SET.length - 1}
                      className="w-[56px] h-[56px] lg:w-[48px] lg:h-[48px] rounded-full bg-white dark:bg-neutral-800 shadow-lg flex items-center justify-center pointer-events-auto disabled:opacity-50"
                    >
                      <ChevronRight size={20} className="text-black dark:text-white" strokeWidth={2.5} />
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
          <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setIsExportModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-neutral-900 rounded-[24px] border border-gray-200 dark:border-neutral-800 w-[90%] max-w-[320px] p-6 shadow-2xl transform transition-all flex flex-col items-start text-left">
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-semibold text-black dark:text-white mb-2 font-['Inter']">Export Font</h3>
            <p className="text-[13px] text-gray-500 dark:text-neutral-400 mb-6 leading-relaxed">
              Download your unique handwriting font to use in your favorite apps.
            </p>

            <div className="w-full mb-6">
              <div className="relative group w-full h-[40px]">
                <input
                  type="text"
                  value={fontName}
                  onChange={handleNameChange}
                  placeholder="myhandwriting"
                  className="w-full h-full bg-transparent border-none outline outline-[0.5px] outline-[#D9D9D9] dark:outline-neutral-800 focus:outline-gray-400 dark:focus:outline-neutral-600 rounded-[30px] px-4 text-[14px] font-medium text-black dark:text-white placeholder:text-[#7B7B7B] dark:placeholder:text-neutral-500 transition-all"
                  onFocus={(e) => e.target.placeholder = ''}
                  onBlur={(e) => e.target.placeholder = 'myhandwriting'}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNameConfirm(); }}
                />
                {/* Checkmark Logic */}
                <div className="absolute inset-y-0 right-3 flex items-center">
                  {nameInputState === 'dirty' && fontName.length > 0 && (
                    <button
                      onClick={handleNameConfirm}
                      className="text-gray-400 hover:text-black dark:hover:text-white transition-colors animate-in fade-in duration-200"
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </button>
                  )}
                  {nameInputState === 'saved' && (
                    <div className="text-[#ED0C14] animate-in fade-in zoom-in duration-300">
                      <Check size={16} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={handleExport}
                className="w-full bg-black dark:bg-white text-white dark:text-black h-[40px] rounded-[30px] text-[13px] font-medium hover:bg-neutral-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                Download .ttf
              </button>

              <button
                onClick={handleExportFamily}
                className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-black dark:text-white h-[40px] rounded-[30px] text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                <FileArchive size={14} />
                Download Family (.zip)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
