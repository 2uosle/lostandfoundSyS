/**
 * Centralized Animation Utilities
 * Provides consistent animation classes across the application
 */

// Page transition animations
export const pageTransitions = {
  fadeIn: 'animate-in fade-in duration-500',
  slideUp: 'animate-in slide-in-from-bottom-4 duration-500',
  slideDown: 'animate-in slide-in-from-top-4 duration-500',
  slideLeft: 'animate-in slide-in-from-right-4 duration-500',
  slideRight: 'animate-in slide-in-from-left-4 duration-500',
  zoomIn: 'animate-in zoom-in-95 duration-500',
  combined: 'animate-in fade-in slide-in-from-bottom-4 duration-500',
};

// Stagger delays for sequential animations
export const staggerDelays = {
  none: '',
  xs: 'delay-75',
  sm: 'delay-100',
  md: 'delay-150',
  lg: 'delay-200',
  xl: 'delay-300',
  '2xl': 'delay-500',
};

// Card animations
export const cardAnimations = {
  base: 'transition-all duration-300 ease-out',
  hover: 'hover:scale-[1.02] hover:shadow-xl',
  hoverSubtle: 'hover:scale-[1.01] hover:shadow-lg',
  active: 'active:scale-[0.98]',
  full: 'transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]',
};

// Button animations
export const buttonAnimations = {
  base: 'transition-all duration-200 ease-out',
  hover: 'hover:scale-105 hover:shadow-lg',
  active: 'active:scale-95',
  full: 'transition-all duration-200 ease-out hover:scale-105 hover:shadow-lg active:scale-95',
  pulse: 'animate-pulse',
};

// Input animations
export const inputAnimations = {
  base: 'transition-all duration-200',
  focus: 'focus:scale-[1.01] focus:shadow-md',
  full: 'transition-all duration-200 focus:scale-[1.01] focus:shadow-md',
};

// Modal animations
export const modalAnimations = {
  overlay: 'animate-in fade-in duration-300',
  content: 'animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500',
  contentFast: 'animate-in fade-in zoom-in-95 duration-300',
};

// List item animations
export const listAnimations = {
  item: 'animate-in slide-in-from-left duration-300',
  itemFade: 'animate-in fade-in slide-in-from-left duration-300',
};

// Loading animations
export const loadingAnimations = {
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
};

// Skeleton animations
export const skeletonAnimation = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700';

// Generate staggered animation class
export function getStaggeredAnimation(index: number, baseDelay: number = 50): string {
  return `animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[${index * baseDelay}ms]`;
}

// Generate card entrance animation with index
export function getCardAnimation(index: number): string {
  const delays = ['delay-0', 'delay-75', 'delay-150', 'delay-200', 'delay-300'];
  const delay = delays[Math.min(index, delays.length - 1)] || 'delay-0';
  return `animate-in fade-in slide-in-from-bottom-2 duration-500 ${delay}`;
}

// Hover effect classes
export const hoverEffects = {
  lift: 'hover:-translate-y-1 transition-transform duration-200',
  glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-shadow duration-300',
  grow: 'hover:scale-110 transition-transform duration-200',
  shrink: 'hover:scale-95 transition-transform duration-200',
};

// Gradient animations
export const gradientAnimations = {
  shimmer: 'bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer',
  flow: 'bg-gradient-to-r animate-gradient-flow',
};

// Combine multiple animation classes
export function combineAnimations(...classes: string[]): string {
  return classes.filter(Boolean).join(' ');
}

// Ripple effect utility
export function createRippleEffect(event: React.MouseEvent<HTMLElement>) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.className = 'ripple';

  const existingRipple = button.querySelector('.ripple');
  if (existingRipple) {
    existingRipple.remove();
  }

  button.appendChild(ripple);

  setTimeout(() => ripple.remove(), 600);
}
