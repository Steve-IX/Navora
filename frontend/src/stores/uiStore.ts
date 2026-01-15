import { create } from 'zustand';

type SidePanelContent = 'places' | 'navigation' | 'saved' | 'friends' | 'profile' | 'trips' | 'feed' | 'weather' | 'flights' | null;

interface UIState {
  sidePanelOpen: boolean;
  sidePanelContent: SidePanelContent;
  bottomSheetOpen: boolean;
  bottomSheetContent: 'route' | 'place' | null;
  darkMode: boolean;
  isMapInteracting: boolean;
  setSidePanelOpen: (open: boolean) => void;
  setSidePanelContent: (content: SidePanelContent) => void;
  toggleSidePanel: () => void;
  setBottomSheetOpen: (open: boolean) => void;
  setBottomSheetContent: (content: 'route' | 'place' | null) => void;
  toggleDarkMode: () => void;
  setMapInteracting: (isInteracting: boolean) => void;
}

// Initialize dark mode from localStorage
const getInitialDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('theme-preference');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    // If 'system', check system preference
    if (stored === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    // Default to system preference if no stored value
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
};

// Apply dark mode class to document
const applyDarkMode = (isDark: boolean) => {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#ffffff');
  }

  // Persist to localStorage
  try {
    localStorage.setItem('theme-preference', isDark ? 'dark' : 'light');
  } catch (error) {
    console.warn('Failed to save theme preference:', error);
  }
};

export const useUIStore = create<UIState>((set, get) => {
  // Apply initial dark mode on store creation
  const initialDarkMode = getInitialDarkMode();
  applyDarkMode(initialDarkMode);

  return {
    sidePanelOpen: false,
    sidePanelContent: null,
    bottomSheetOpen: false,
    bottomSheetContent: null,
    darkMode: initialDarkMode,
    isMapInteracting: false,

    setSidePanelOpen: (open) => set({ sidePanelOpen: open }),
    setSidePanelContent: (content) =>
      set({ sidePanelContent: content, sidePanelOpen: content !== null }),
    toggleSidePanel: () => set((state) => ({ sidePanelOpen: !state.sidePanelOpen })),
    setBottomSheetOpen: (open) => set({ bottomSheetOpen: open }),
    setBottomSheetContent: (content) =>
      set({ bottomSheetContent: content, bottomSheetOpen: content !== null }),
    toggleDarkMode: () => {
      const newDarkMode = !get().darkMode;
      applyDarkMode(newDarkMode);
      set({ darkMode: newDarkMode });
    },
    setMapInteracting: (isInteracting) => set({ isMapInteracting: isInteracting }),
  };
});

