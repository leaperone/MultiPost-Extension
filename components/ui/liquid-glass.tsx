'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps, useReducedMotion } from 'framer-motion';

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
  'bg-white/60 dark:bg-white/10',
  'border border-white/50 dark:border-white/20',
  'shadow-[0_8px_32px_rgba(0,0,0,0.06)]',
  'dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]',
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
      default: '',
      elevated: 'shadow-xl',
      flat: 'shadow-none bg-white/40 dark:bg-white/5',
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
          'inline-flex items-center justify-center whitespace-nowrap',
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
      default: '',
      elevated: 'shadow-xl',
      flat: 'shadow-none bg-white/40 dark:bg-white/5',
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
// LiquidGlassPageLayout - Page background with glass effects
// ============================================

interface LiquidGlassPageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  backgroundImage?: string;
  showOrbs?: boolean;
}

// Hook to detect mobile devices
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Static orbs for reduced motion / mobile
const StaticOrbs = () => (
  <div className="pointer-events-none fixed inset-0 overflow-hidden">
    <div className="absolute -left-32 -top-32 size-96 rounded-full bg-blue-400/15 blur-3xl dark:bg-blue-600/15" />
    <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-purple-400/15 blur-3xl dark:bg-purple-600/15" />
  </div>
);

// Animated orbs for desktop with motion enabled
const AnimatedOrbs = () => (
  <div className="pointer-events-none fixed inset-0 overflow-hidden">
    <motion.div
      className="absolute -left-32 -top-32 size-96 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/20"
      animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute -bottom-32 -right-32 size-96 rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-600/20"
      animate={{ x: [0, -20, 0], y: [0, -30, 0] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
    />
    <motion.div
      className="absolute left-1/2 top-1/3 size-64 -translate-x-1/2 rounded-full bg-pink-400/15 blur-3xl dark:bg-pink-600/15"
      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
    />
  </div>
);

const LiquidGlassPageLayout = React.forwardRef<HTMLDivElement, LiquidGlassPageLayoutProps>(
  ({ className, backgroundImage, showOrbs = true, children, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const isMobile = useIsMobile();

    // Disable animated orbs if user prefers reduced motion or on mobile
    const shouldAnimateOrbs = showOrbs && !prefersReducedMotion && !isMobile;
    // Show static orbs on mobile (but not if user disabled orbs entirely)
    const shouldShowStaticOrbs = showOrbs && (prefersReducedMotion || isMobile);

    return (
      <div
        ref={ref}
        className={cn('relative h-full overflow-y-auto', className)}
        {...props}>
        {/* Background image */}
        {backgroundImage && (
          <div
            className="fixed inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}

        {/* Overlay mask */}
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm dark:bg-black/60" />

        {/* Orbs - animated on desktop, static on mobile/reduced-motion */}
        {shouldAnimateOrbs && <AnimatedOrbs />}
        {shouldShowStaticOrbs && <StaticOrbs />}

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    );
  },
);
LiquidGlassPageLayout.displayName = 'LiquidGlassPageLayout';

// ============================================
// LiquidGlassInput - Glass-style input
// ============================================

interface LiquidGlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  glassVariant?: 'default' | 'flat';
}

const LiquidGlassInput = React.forwardRef<HTMLInputElement, LiquidGlassInputProps>(
  ({ className, glassVariant = 'default', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl px-4 py-3 text-base transition-all duration-200',
          'bg-white/10 dark:bg-black/20',
          'backdrop-blur-md backdrop-saturate-150',
          'border border-white/20 dark:border-white/10',
          'placeholder:text-foreground/40',
          'focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 dark:focus:border-white/20',
          glassVariant === 'flat' && 'border-transparent bg-white/5 dark:bg-black/10',
          className,
        )}
        {...props}
      />
    );
  },
);
LiquidGlassInput.displayName = 'LiquidGlassInput';

// ============================================
// LiquidGlassTabs - Glass-style tabs container
// ============================================

interface LiquidGlassTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'pills';
}

const LiquidGlassTabs = React.forwardRef<HTMLDivElement, LiquidGlassTabsProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-2xl p-1',
          variant === 'default' && [
            'bg-white/10 dark:bg-black/20',
            'backdrop-blur-md backdrop-saturate-150',
            'border border-white/15 dark:border-white/10',
          ],
          variant === 'pills' && 'bg-transparent',
          className,
        )}
        {...props}>
        {children}
      </div>
    );
  },
);
LiquidGlassTabs.displayName = 'LiquidGlassTabs';

// ============================================
// LiquidGlassTab - Individual glass tab
// ============================================

interface LiquidGlassTabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

const LiquidGlassTab = React.forwardRef<HTMLButtonElement, LiquidGlassTabProps>(
  ({ className, isActive = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap',
          'rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-white/20 text-foreground shadow-sm dark:bg-white/15'
            : 'text-foreground/60 hover:bg-white/10 hover:text-foreground dark:hover:bg-white/5',
          className,
        )}
        {...props}>
        {children}
      </button>
    );
  },
);
LiquidGlassTab.displayName = 'LiquidGlassTab';

// ============================================
// LiquidGlassHeader - Section header with glass effect
// ============================================

interface LiquidGlassHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const LiquidGlassHeader = React.forwardRef<HTMLDivElement, LiquidGlassHeaderProps>(
  ({ className, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mb-8 flex items-center justify-between', className)}
        {...props}>
        <div>
          <h1 className="text-3xl font-bold text-foreground/90">{title}</h1>
          {description && <p className="mt-2 text-foreground/60">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    );
  },
);
LiquidGlassHeader.displayName = 'LiquidGlassHeader';

// ============================================
// LiquidGlassStatCard - Stats display card
// ============================================

interface LiquidGlassStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  iconColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default';
  label: string;
  value: string | number;
}

const LiquidGlassStatCard = React.forwardRef<HTMLDivElement, LiquidGlassStatCardProps>(
  ({ className, icon, iconColor = 'primary', label, value, ...props }, ref) => {
    const iconColorStyles = {
      primary: 'bg-blue-500/20 text-blue-500 dark:bg-blue-400/20 dark:text-blue-400',
      secondary: 'bg-purple-500/20 text-purple-500 dark:bg-purple-400/20 dark:text-purple-400',
      success: 'bg-green-500/20 text-green-500 dark:bg-green-400/20 dark:text-green-400',
      warning: 'bg-amber-500/20 text-amber-500 dark:bg-amber-400/20 dark:text-amber-400',
      danger: 'bg-red-500/20 text-red-500 dark:bg-red-400/20 dark:text-red-400',
      default: 'bg-white/20 text-foreground/70 dark:bg-white/10',
    };

    return (
      <LiquidGlassCard
        ref={ref}
        className={cn('p-5', className)}
        {...props}>
        <div className="flex items-center gap-4">
          <div className={cn('flex size-12 items-center justify-center rounded-2xl', iconColorStyles[iconColor])}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-foreground/60">{label}</p>
            <p className="text-2xl font-bold text-foreground/90">{value}</p>
          </div>
        </div>
      </LiquidGlassCard>
    );
  },
);
LiquidGlassStatCard.displayName = 'LiquidGlassStatCard';

// ============================================
// LiquidGlassStepper - Step indicator
// ============================================

interface Step {
  id: number;
  name: string;
  description: string;
}

interface LiquidGlassStepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  currentStep: number;
  title: string;
  onStepClick?: (stepId: number) => void;
}

const LiquidGlassStepper = React.forwardRef<HTMLDivElement, LiquidGlassStepperProps>(
  ({ className, steps, currentStep, title, onStepClick, ...props }, ref) => {
    return (
      <LiquidGlassCard
        ref={ref}
        className={cn('sticky top-4 h-fit p-6', className)}
        {...props}>
        <p className="mb-6 text-lg font-bold text-foreground/90">{title}</p>
        <div className="flex flex-col gap-6">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-4 transition-opacity',
                currentStep > step.id ? 'cursor-pointer opacity-100' : 'cursor-default',
                currentStep < step.id && 'opacity-50',
              )}
              onClick={() => {
                if (onStepClick && currentStep > step.id) {
                  onStepClick(step.id);
                }
              }}>
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full font-bold transition-all',
                  step.id === currentStep &&
                    'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25',
                  currentStep > step.id && 'bg-blue-500/20 text-blue-500 dark:bg-blue-400/20 dark:text-blue-400',
                  currentStep < step.id && 'bg-white/20 text-foreground/50 dark:bg-white/10',
                )}>
                {index + 1}
              </div>
              <div>
                <p className="font-semibold text-foreground/90">{step.name}</p>
                <p className="text-sm text-foreground/50">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </LiquidGlassCard>
    );
  },
);
LiquidGlassStepper.displayName = 'LiquidGlassStepper';

// ============================================
// LiquidGlassDropZone - Drag and drop area
// ============================================

interface LiquidGlassDropZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  isDragging?: boolean;
  icon?: React.ReactNode;
  text?: string;
  subText?: string;
}

const LiquidGlassDropZone = React.forwardRef<HTMLDivElement, LiquidGlassDropZoneProps>(
  ({ className, isDragging = false, icon, text, subText, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-300',
          isDragging
            ? 'border-blue-500/50 bg-blue-500/10 dark:border-blue-400/50 dark:bg-blue-400/10'
            : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/5',
          className,
        )}
        {...props}>
        {children || (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            {icon && (
              <div className={cn('transition-colors', isDragging ? 'text-blue-500 dark:text-blue-400' : 'text-foreground/40')}>
                {icon}
              </div>
            )}
            {text && (
              <p className={cn('text-sm font-medium', isDragging ? 'text-blue-500 dark:text-blue-400' : 'text-foreground/60')}>
                {text}
              </p>
            )}
            {subText && <p className="text-xs text-foreground/40">{subText}</p>}
          </div>
        )}
      </div>
    );
  },
);
LiquidGlassDropZone.displayName = 'LiquidGlassDropZone';

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
  LiquidGlassPageLayout,
  LiquidGlassInput,
  LiquidGlassTabs,
  LiquidGlassTab,
  LiquidGlassHeader,
  LiquidGlassStatCard,
  LiquidGlassStepper,
  LiquidGlassDropZone,
  glassBaseStyles,
};
