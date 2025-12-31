import { create } from 'zustand';

interface UIState {
  sidePanelOpen: boolean;
  sidePanelContent: 'places' | 'navigation' | 'saved' | 'friends' | 'profile' | 'trips' | 'feed' | null;
  bottomSheetOpen: boolean;
  bottomSheetContent: 'route' | 'place' | null;
  darkMode: boolean;
  setSidePanelOpen: (open: boolean) => void;
  setSidePanelContent: (content: 'places' | 'navigation' | 'saved' | 'friends' | 'profile' | 'trips' | 'feed' | null) => void;
  toggleSidePanel: () => void;
  setBottomSheetOpen: (open: boolean) => void;
  setBottomSheetContent: (content: 'route' | 'place' | null) => void;
  toggleDarkMode: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidePanelOpen: false,
  sidePanelContent: null,
  bottomSheetOpen: false,
  bottomSheetContent: null,
  darkMode: false,

  setSidePanelOpen: (open) => set({ sidePanelOpen: open }),
  setSidePanelContent: (content) =>
    set({ sidePanelContent: content, sidePanelOpen: content !== null }),
  toggleSidePanel: () => set((state) => ({ sidePanelOpen: !state.sidePanelOpen })),
  setBottomSheetOpen: (open) => set({ bottomSheetOpen: open }),
  setBottomSheetContent: (content) =>
    set({ bottomSheetContent: content, bottomSheetOpen: content !== null }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));

