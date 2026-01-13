/**
 * Animation Utilities
 *
 * Reusable Framer Motion animation variants and configuration.
 * Provides consistent, performant animations across the application.
 */

import { Variants, Transition } from 'framer-motion';

// ============================================================================
// TRANSITION PRESETS
// ============================================================================

/**
 * Spring physics for natural, bouncy animations
 */
export const spring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

/**
 * Smooth spring for less bouncy, more controlled animations
 */
export const smoothSpring: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
};

/**
 * Tween for linear animations
 */
export const tween: Transition = {
  type: 'tween',
  duration: 0.25,
  ease: 'easeInOut',
};

/**
 * Fast tween for quick animations
 */
export const fastTween: Transition = {
  type: 'tween',
  duration: 0.15,
  ease: 'easeOut',
};

/**
 * Slow tween for deliberate animations
 */
export const slowTween: Transition = {
  type: 'tween',
  duration: 0.35,
  ease: 'easeInOut',
};

// ============================================================================
// FADE ANIMATIONS
// ============================================================================

/**
 * Simple fade in/out
 */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Fade in from transparent to opaque
 */
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/**
 * Fade in from bottom
 */
export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

// ============================================================================
// SLIDE ANIMATIONS
// ============================================================================

/**
 * Slide in from right
 */
export const slideInRight: Variants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
};

/**
 * Slide in from left
 */
export const slideInLeft: Variants = {
  initial: { x: '-100%' },
  animate: { x: 0 },
  exit: { x: '-100%' },
};

/**
 * Slide in from bottom
 */
export const slideInBottom: Variants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
};

/**
 * Slide in from top
 */
export const slideInTop: Variants = {
  initial: { y: '-100%' },
  animate: { y: 0 },
  exit: { y: '-100%' },
};

/**
 * Slide up (for bottom sheets and modals)
 */
export const slideUp: Variants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 20, opacity: 0 },
};

/**
 * Slide down (for dropdowns)
 */
export const slideDown: Variants = {
  initial: { y: -20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 },
};

// ============================================================================
// SCALE ANIMATIONS
// ============================================================================

/**
 * Scale in from center
 */
export const scaleIn: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
};

/**
 * Pop in (slight overshoot)
 */
export const popIn: Variants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
};

/**
 * Zoom in
 */
export const zoomIn: Variants = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  exit: { scale: 0 },
};

// ============================================================================
// ROTATION ANIMATIONS
// ============================================================================

/**
 * Rotate 180 degrees (for icons)
 */
export const rotate180: Variants = {
  initial: { rotate: 0 },
  animate: { rotate: 180 },
};

/**
 * Rotate 90 degrees
 */
export const rotate90: Variants = {
  initial: { rotate: 0 },
  animate: { rotate: 90 },
};

// ============================================================================
// BACKDROP ANIMATIONS
// ============================================================================

/**
 * Backdrop fade (for modal overlays)
 */
export const backdropFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ============================================================================
// STAGGER ANIMATIONS
// ============================================================================

/**
 * Stagger children with delay
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

/**
 * Fast stagger for lists
 */
export const fastStagger: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

/**
 * Slow stagger for dramatic effect
 */
export const slowStagger: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

/**
 * Stagger item (child of stagger container)
 */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

// ============================================================================
// HOVER/TAP ANIMATIONS
// ============================================================================

/**
 * Button hover scale
 */
export const buttonHover = {
  scale: 1.05,
  transition: fastTween,
};

/**
 * Button tap scale
 */
export const buttonTap = {
  scale: 0.95,
};

/**
 * Card hover lift
 */
export const cardHover = {
  y: -4,
  transition: smoothSpring,
};

/**
 * Icon spin (for loading states)
 */
export const spin = {
  rotate: 360,
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'linear',
  },
};

// ============================================================================
// MODAL/DIALOG ANIMATIONS
// ============================================================================

/**
 * Modal container (backdrop + content)
 */
export const modalContainer: Variants = {
  initial: {},
  animate: {},
  exit: {},
};

/**
 * Modal content
 */
export const modalContent: Variants = {
  initial: { scale: 0.95, opacity: 0, y: 20 },
  animate: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.95, opacity: 0, y: 20 },
};

/**
 * Side panel animation
 */
export const sidePanel: Variants = {
  initial: { x: '-100%' },
  animate: { x: 0 },
  exit: { x: '-100%' },
};

/**
 * Bottom sheet animation
 */
export const bottomSheet: Variants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
};

// ============================================================================
// SEARCH BAR ANIMATIONS
// ============================================================================

/**
 * Search bar expand
 */
export const searchExpand: Variants = {
  initial: { width: '300px' },
  focus: { width: '400px' },
};

/**
 * Search results container
 */
export const searchResults: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
};

// ============================================================================
// FAB (FLOATING ACTION BUTTON) ANIMATIONS
// ============================================================================

/**
 * FAB menu container
 */
export const fabMenu: Variants = {
  closed: {},
  open: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

/**
 * FAB menu item
 */
export const fabMenuItem: Variants = {
  closed: { opacity: 0, y: 20, scale: 0 },
  open: { opacity: 1, y: 0, scale: 1 },
};

/**
 * Main FAB rotation (for expand/collapse icon)
 */
export const fabRotate: Variants = {
  closed: { rotate: 0 },
  open: { rotate: 45 },
};

// ============================================================================
// TOAST ANIMATIONS
// ============================================================================

/**
 * Toast notification slide in
 */
export const toastSlideIn: Variants = {
  initial: { x: 400, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 400, opacity: 0 },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a custom transition with duration and easing
 */
export const createTransition = (
  duration: number,
  ease: string | number[] = 'easeInOut',
  type: 'tween' | 'spring' = 'tween'
): Transition => {
  if (type === 'spring') {
    return {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    };
  }
  return {
    type: 'tween',
    duration,
    ease,
  };
};

/**
 * Create stagger animation with custom delay
 */
export const createStagger = (delayChildren: number, staggerChildren: number): Variants => ({
  initial: {},
  animate: {
    transition: {
      delayChildren,
      staggerChildren,
    },
  },
});

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example usage:
 *
 * // Simple fade in
 * <motion.div variants={fadeIn} initial="initial" animate="animate" exit="exit">
 *   Content
 * </motion.div>
 *
 * // Stagger list
 * <motion.ul variants={staggerContainer} initial="initial" animate="animate">
 *   {items.map(item => (
 *     <motion.li key={item.id} variants={staggerItem}>
 *       {item.name}
 *     </motion.li>
 *   ))}
 * </motion.ul>
 *
 * // Button with hover/tap
 * <motion.button whileHover={buttonHover} whileTap={buttonTap}>
 *   Click me
 * </motion.button>
 *
 * // Modal with backdrop
 * <AnimatePresence>
 *   {isOpen && (
 *     <motion.div variants={backdropFade} initial="initial" animate="animate" exit="exit">
 *       <motion.div variants={modalContent}>
 *         Modal content
 *       </motion.div>
 *     </motion.div>
 *   )}
 * </AnimatePresence>
 */
