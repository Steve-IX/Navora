/**
 * Design System Tokens
 *
 * Centralized design system constants for colors, spacing, typography, animations, and z-index layers.
 * These tokens ensure consistency across the application and make theming easier.
 */

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Primary brand colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Semantic colors
  success: {
    light: '#dcfce7',
    main: '#22c55e',
    dark: '#15803d',
  },
  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#b45309',
  },
  error: {
    light: '#fee2e2',
    main: '#ef4444',
    dark: '#b91c1c',
  },
  info: {
    light: '#dbeafe',
    main: '#3b82f6',
    dark: '#1d4ed8',
  },

  // Neutral colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Dark mode colors
  dark: {
    bg: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
    },
    surface: {
      elevated: '#1e293b',
      overlay: '#334155',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
      muted: '#94a3b8',
    },
    border: {
      subtle: '#334155',
      default: '#475569',
    },
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    display: 'Inter, system-ui, sans-serif',
    mono: 'Fira Code, Monaco, Consolas, monospace',
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  0: '0px',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
  40: '10rem',    // 160px
  48: '12rem',    // 192px
  56: '14rem',    // 224px
  64: '16rem',    // 256px
} as const;

// ============================================================================
// SHADOWS & ELEVATION
// ============================================================================

export const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Elevation levels (Google Maps-inspired)
  elevation1: '0 1px 2px rgba(0,0,0,0.05)',
  elevation2: '0 4px 6px -1px rgba(0,0,0,0.1)',
  elevation3: '0 10px 15px -3px rgba(0,0,0,0.1)',
  elevation4: '0 20px 25px -5px rgba(0,0,0,0.1)',

  // Dark mode shadows
  darkSm: '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
  darkMd: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
  darkLg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// ============================================================================
// ANIMATIONS & TRANSITIONS
// ============================================================================

export const animations = {
  duration: {
    fast: 150,      // ms
    normal: 250,    // ms
    slow: 350,      // ms
  },

  easing: {
    // Standard easing functions
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Custom easing
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  notification: 80,
  max: 9999,
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  sm: '640px',   // Small tablets and large phones
  md: '768px',   // Tablets
  lg: '1024px',  // Small laptops
  xl: '1280px',  // Desktops
  '2xl': '1536px', // Large desktops
} as const;

// ============================================================================
// ICON SIZES
// ============================================================================

export const iconSizes = {
  xs: 12,   // px
  sm: 16,   // px
  md: 20,   // px
  lg: 24,   // px
  xl: 32,   // px
  '2xl': 48,  // px
} as const;

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get a CSS variable for a color token
 * @param path - Dot-notation path to color (e.g., 'primary.500')
 */
export const getColor = (path: string): string => {
  const parts = path.split('.');
  let value: any = colors;

  for (const part of parts) {
    value = value[part];
    if (!value) return '';
  }

  return value;
};

/**
 * Get duration in milliseconds
 * @param key - Duration key (fast, normal, slow)
 */
export const getDuration = (key: keyof typeof animations.duration): number => {
  return animations.duration[key];
};

/**
 * Get transition CSS string
 * @param property - CSS property to transition
 * @param duration - Duration key
 * @param easing - Easing key
 */
export const getTransition = (
  property: string,
  duration: keyof typeof animations.duration = 'normal',
  easing: keyof typeof animations.easing = 'smooth'
): string => {
  return `${property} ${animations.duration[duration]}ms ${animations.easing[easing]}`;
};
