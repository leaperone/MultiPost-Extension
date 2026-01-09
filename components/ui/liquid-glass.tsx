'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

/**
 * iOS 26 Liquid Glass Design System
 *
 * Core design principles:
 * - Translucent backgrounds with backdrop blur
 * - Subtle borders with white/black opacity
 * - Inset shadows for specular highlights
 * - Smooth rounded corners (24px-32px)
 * - Dynamic light/dark mode adaptation
 */

// Base glass styles
const glassBaseStyles = cn(
  'backdrop-blur-xl backdrop-saturate-150',
  'border border-white/20 dark:border-white/10',
  'shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
  'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]',
);

// ============================================
// LiquidGlassCard
// ============================================

interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'flat';
  interactive?: boolean;
  as?: 'div' | 'article' | 'section';
}

const LiquidGlassCard = React.forwardRef<HTMLDivElement, LiquidGlassCardProps>(
  ({ className, variant = 'default', interactive = false, as: Component = 'div', children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white/15 dark:bg-black/30',
      elevated: 'bg-white/20 dark:bg-black/40 shadow-xl',
      flat: 'bg-white/10 dark:bg-black/20 shadow-none',
    };

    return (
      <Component
        ref={ref}
        className={cn(
          glassBaseStyles,
          variantStyles[variant],
          'rounded-3xl',
          interactive && 'cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]',
          className,
        )}
        {...props}>
        {children}
      </Component>
    );
  },
);
LiquidGlassCard.displayName = 'LiquidGlassCard';

// ============================================
// LiquidGlassButton
// ============================================

interface LiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const LiquidGlassButton = React.forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20',
      primary:
        'bg-gradient-to-br from-blue-500/80 to-purple-600/80 text-white border-white/30 hover:from-blue-500/90 hover:to-purple-600/90',
      ghost: 'bg-transparent hover:bg-white/10 dark:hover:bg-white/5 border-transparent shadow-none',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm rounded-xl',
      md: 'px-4 py-2 text-base rounded-2xl',
      lg: 'px-6 py-3 text-lg rounded-2xl',
    };

    return (
      <button
        ref={ref}
        className={cn(
          glassBaseStyles,
          variantStyles[variant],
          sizeStyles[size],
          'font-medium transition-all duration-200',
          'active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}>
        {children}
      </button>
    );
  },
);
LiquidGlassButton.displayName = 'LiquidGlassButton';

// ============================================
// LiquidGlassContainer
// ============================================

interface LiquidGlassContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  blur?: 'sm' | 'md' | 'lg' | 'xl';
}

const LiquidGlassContainer = React.forwardRef<HTMLDivElement, LiquidGlassContainerProps>(
  ({ className, blur = 'xl', children, ...props }, ref) => {
    const blurStyles = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
      xl: 'backdrop-blur-xl',
    };

    return (
      <div
        ref={ref}
        className={cn(
          blurStyles[blur],
          'backdrop-saturate-150',
          'bg-white/10 dark:bg-black/20',
          'border border-white/10 dark:border-white/5',
          'rounded-3xl',
          className,
        )}
        {...props}>
        {children}
      </div>
    );
  },
);
LiquidGlassContainer.displayName = 'LiquidGlassContainer';

// ============================================
// LiquidGlassIconContainer
// ============================================

interface LiquidGlassIconContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

const LiquidGlassIconContainer = React.forwardRef<HTMLDivElement, LiquidGlassIconContainerProps>(
  ({ className, size = 'md', color = 'default', children, ...props }, ref) => {
    const sizeStyles = {
      sm: 'size-12',
      md: 'size-16',
      lg: 'size-24',
      xl: 'size-32',
    };

    const colorStyles = {
      default: 'bg-white/20 dark:bg-white/10',
      primary: 'bg-blue-500/20 dark:bg-blue-400/20',
      secondary: 'bg-purple-500/20 dark:bg-purple-400/20',
      success: 'bg-green-500/20 dark:bg-green-400/20',
      warning: 'bg-amber-500/20 dark:bg-amber-400/20',
      danger: 'bg-red-500/20 dark:bg-red-400/20',
    };

    return (
      <div
        ref={ref}
        className={cn(
          glassBaseStyles,
          sizeStyles[size],
          colorStyles[color],
          'rounded-full',
          'flex items-center justify-center',
          className,
        )}
        {...props}>
        {children}
      </div>
    );
  },
);
LiquidGlassIconContainer.displayName = 'LiquidGlassIconContainer';

// ============================================
// LiquidGlassMotionCard (with Framer Motion)
// ============================================

interface LiquidGlassMotionCardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'elevated' | 'flat';
  interactive?: boolean;
}

const LiquidGlassMotionCard = React.forwardRef<HTMLDivElement, LiquidGlassMotionCardProps>(
  ({ className, variant = 'default', interactive = true, children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white/15 dark:bg-black/30',
      elevated: 'bg-white/20 dark:bg-black/40',
      flat: 'bg-white/10 dark:bg-black/20',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(glassBaseStyles, variantStyles[variant], 'rounded-3xl overflow-hidden', className)}
        whileHover={interactive ? { scale: 1.02, y: -4 } : undefined}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        {...props}>
        {children}
      </motion.div>
    );
  },
);
LiquidGlassMotionCard.displayName = 'LiquidGlassMotionCard';

// ============================================
// GlassBackground - For page backgrounds
// ============================================

interface GlassBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'mesh' | 'gradient' | 'aurora';
}

const GlassBackground = React.forwardRef<HTMLDivElement, GlassBackgroundProps>(
  ({ className, variant = 'mesh', children, ...props }, ref) => {
    const backgroundStyles = {
      mesh: cn(
        'bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100',
        'dark:from-blue-950 dark:via-purple-950 dark:to-pink-950',
      ),
      gradient: cn(
        'bg-gradient-to-br from-slate-100 via-white to-slate-100',
        'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900',
      ),
      aurora: cn(
        'bg-gradient-to-br from-green-100 via-blue-100 to-purple-100',
        'dark:from-green-950 dark:via-blue-950 dark:to-purple-950',
      ),
    };

    return (
      <div
        ref={ref}
        className={cn('relative min-h-screen', backgroundStyles[variant], className)}
        {...props}>
        {/* Animated gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 size-80 animate-pulse rounded-full bg-purple-400/30 blur-3xl dark:bg-purple-600/20" />
          <div className="absolute -bottom-40 -right-40 size-80 animate-pulse rounded-full bg-blue-400/30 blur-3xl delay-1000 dark:bg-blue-600/20" />
          <div className="absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-pink-400/20 blur-3xl delay-500 dark:bg-pink-600/10" />
        </div>
        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    );
  },
);
GlassBackground.displayName = 'GlassBackground';

// ============================================
// Exports
// ============================================

export {
  LiquidGlassCard,
  LiquidGlassButton,
  LiquidGlassContainer,
  LiquidGlassIconContainer,
  LiquidGlassMotionCard,
  GlassBackground,
  glassBaseStyles,
};
