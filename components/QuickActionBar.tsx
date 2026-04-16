import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---
export interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
}

interface QuickActionBarProps {
  actions: QuickAction[];
}

// --- SVG Icons (48px viewbox for crisp rendering) ---
const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BarcodeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M3 7V17M7 7V17M11 7V17M15 7V17M19 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M21 4H3M21 20H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ReceiptIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19L9 17L12 19L15 17L19 19V7C19 5.89543 18.1046 5 17 5H15M9 5V3M9 5H15M15 5V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 10H15M9 14H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// --- Constants ---
const FIRST_USE_KEY = 'pantry-pal-quick-action-first-use';
const TOUCH_TARGET_SIZE = 48; // 48px minimum touch target
const LONG_PRESS_DURATION = 600; // ms before long press triggers

// --- Hook: First-time usage detection ---
const useFirstTimeDetection = () => {
  const [isFirstTime] = useState(() => {
    try {
      const hasUsedBefore = localStorage.getItem(FIRST_USE_KEY);
      if (!hasUsedBefore) {
        localStorage.setItem(FIRST_USE_KEY, 'true');
        return true;
      }
      return false;
    } catch {
      // localStorage not available (private mode, etc)
      return false;
    }
  });

  return isFirstTime;
};

// --- Hook: Long press detection ---
const useLongPress = (onLongPress: () => void, duration = LONG_PRESS_DURATION) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback(() => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, duration);
  }, [onLongPress, duration]);

  const end = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return isLongPressRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, []);

  return { start, end };
};

// --- Desktop Quick Action Button ---
interface DesktopActionButtonProps {
  action: QuickAction;
  isFirstTime: boolean;
}

const DesktopActionButton: React.FC<DesktopActionButtonProps> = ({ action, isFirstTime }) => {
  // Compute initial showTooltip from isFirstTime
  const [showTooltip, setShowTooltip] = useState(isFirstTime);

  // Auto-hide tooltip after 2 seconds on first use
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  return (
    <div className="relative">
      <button
        onClick={action.onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all
                   bg-slate-100 text-slate-700 
                   hover:bg-emerald-100 hover:text-emerald-700
                   active:scale-95
                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        aria-label={action.label}
        style={{ minHeight: TOUCH_TARGET_SIZE }}
      >
        <span className="w-5 h-5 flex items-center justify-center">{action.icon}</span>
        <span className="text-sm hidden sm:inline">{action.label}</span>
      </button>

      {/* Tooltip - only icon shows tooltip on hover for desktop */}
      <div
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 
                    bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap
                    transition-all duration-200 pointer-events-none
                    ${showTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
        role="tooltip"
      >
        {action.label}
        {action.shortcut && <span className="ml-1 text-slate-400">({action.shortcut})</span>}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
};

// --- Mobile FAB Action Bubble ---
interface MobileActionBubbleProps {
  action: QuickAction;
  index: number;
  isOpen: boolean;
}

const MobileActionBubble: React.FC<MobileActionBubbleProps> = ({ action, index, isOpen }) => {
  const [showLabel, setShowLabel] = useState(false);
  const [isExpandedLabel, setIsExpandedLabel] = useState(false);

  const handleLongPress = useCallback(() => {
    setShowLabel(true);
  }, []);

  const { start, end } = useLongPress(handleLongPress);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    const wasLongPress = end();
    if (wasLongPress) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setShowLabel(false);
    action.onClick();
  };

  // When menu opens, show labels briefly on first use items
  // Using setTimeout to avoid synchronous setState during render
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let hideTimer: NodeJS.Timeout | null = null;
    
    if (isOpen) {
      timer = setTimeout(() => setIsExpandedLabel(true), 100 + index * 80);
      hideTimer = setTimeout(() => setIsExpandedLabel(false), 1500 + index * 100);
    } else {
      // Schedule state updates outside of synchronous execution
      timer = setTimeout(() => {
        setIsExpandedLabel(false);
        setShowLabel(false);
      }, 0);
    }
    
    return () => {
      if (timer != null) clearTimeout(timer);
      if (hideTimer != null) clearTimeout(hideTimer);
    };
  }, [isOpen, index]);

  // Calculate position in arc pattern
  // 3 items arrange in an arc above the main FAB
  const getPosition = () => {
    const radius = 90; // distance from FAB center
    const startAngle = 180; // Start from left
    const endAngle = 90; // End at top
    const step = (endAngle - startAngle) / 2; // 3 items = 2 steps
    const angle = startAngle + step * index;
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius,
    };
  };

  const position = getPosition();
  const shouldShowLabel = showLabel || isExpandedLabel;

  return (
    <div
      className={`absolute transition-all duration-300 ease-out
                  ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      style={{
        transform: isOpen ? `translate(${position.x}px, ${position.y}px)` : 'translate(0, 0)',
        transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
      }}
    >
      <div className="relative flex items-center gap-2">
        {/* Label - appears on long press or first expand */}
        <div
          className={`absolute right-full mr-2 px-3 py-1.5 bg-slate-800 text-white text-sm 
                      rounded-lg whitespace-nowrap transition-all duration-200
                      ${shouldShowLabel ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}
        >
          {action.label}
        </div>

        {/* Action button */}
        <button
          onClick={handleClick}
          onMouseDown={start}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchEnd={end}
          onTouchCancel={end}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center
                      transition-all duration-200 active:scale-90
                      ${action.id === 'add' 
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}
                      focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
          style={{ minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
          aria-label={action.label}
          tabIndex={isOpen ? 0 : -1}
        >
          {action.icon}
        </button>
      </div>
    </div>
  );
};

// --- Main Component ---
export const QuickActionBar: React.FC<QuickActionBarProps> = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstTime = useFirstTimeDetection();

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // 640px matches sm breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const action = actions.find(a => a.shortcut?.toLowerCase() === e.key.toLowerCase());
        if (action != null) {
          e.preventDefault();
          action.onClick();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  // Handle FAB toggle
  const toggleFab = () => {
    setIsOpen(!isOpen);
  };

  // Handle action click with menu close
  const handleActionClick = (action: QuickAction) => {
    return () => {
      action.onClick();
      setIsOpen(false);
    };
  };

  // Desktop horizontal bar layout
  if (!isMobile) {
    return (
      <div className="flex items-center gap-2" role="toolbar" aria-label="Quick actions">
        {actions.map((action) => (
          <DesktopActionButton
            key={action.id}
            action={{ ...action, onClick: handleActionClick(action) }}
            isFirstTime={isFirstTime}
          />
        ))}
      </div>
    );
  }

  // Mobile FAB layout
  // Calculate FAB position to avoid mobile nav and safe areas
  return (
    <div
      ref={containerRef}
      className="fixed right-4 z-[10100] md:hidden"
      style={{
        bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
      }}
      role="toolbar"
      aria-label="Quick actions"
    >
      {/* Action bubbles (expand from FAB) */}
      <div className="relative z-[10110]">
        {actions.map((action, index) => (
          <MobileActionBubble
            key={action.id}
            action={{ ...action, onClick: handleActionClick(action) }}
            index={index}
            isOpen={isOpen}
          />
        ))}
      </div>

      {/* Backdrop overlay - z-index above navbar but below FAB */}
      <button
        className={`fixed inset-0 bg-black/30 transition-opacity duration-300 md:hidden z-[10050]
                    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
        aria-label="Close quick action menu"
        tabIndex={-1}
      />

      {/* Main FAB button - positioned above all UI layers */}
      <button
        onClick={toggleFab}
        className={`relative z-[10100] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center
                    transition-all duration-300 ease-out border-2 border-white/20
                    ${isOpen 
                      ? 'bg-rose-500 text-white rotate-45 hover:bg-rose-600' 
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'}
                    active:scale-90
                    focus:outline-none focus:ring-4 focus:ring-emerald-300`}
        style={{ minWidth: 56, minHeight: 56 }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={isOpen ? 'Close quick action menu' : 'Open quick action menu'}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          className={`transition-transform duration-300 ${isOpen ? 'rotate-0' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Mobile hint for first-time users - stays above FAB */}
      {isFirstTime && !isOpen && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap animate-in slide-in-from-bottom-2 duration-300 z-[10120]">
          Tap + for quick actions
          <div className="absolute top-full right-6 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
};

// --- Preset Actions Builder ---
export const createQuickActions = (
  onAdd: () => void,
  onBarcode: () => void,
  onReceipt: () => void
): QuickAction[] => [
  {
    id: 'add',
    icon: <PlusIcon />,
    label: 'Add Item',
    onClick: onAdd,
    shortcut: 'a',
  },
  {
    id: 'barcode',
    icon: <BarcodeIcon />,
    label: 'Scan Barcode',
    onClick: onBarcode,
    shortcut: 'b',
  },
  {
    id: 'receipt',
    icon: <ReceiptIcon />,
    label: 'Scan Receipt',
    onClick: onReceipt,
    shortcut: 'r',
  },
];

export default QuickActionBar;
