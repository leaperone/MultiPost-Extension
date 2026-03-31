// app/components/ThemeSwitcher.tsx
'use client';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from "@heroui/react";
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { SidebarMenuButton } from './ui/sidebar';

interface ThemeSwitcherProps {
  className?: string;
  isBlur?: boolean;
}

const themeOrder = ['light', 'dark', 'system'] as const;

function getNextTheme(current: string | undefined): string {
  const currentIndex = themeOrder.indexOf(current as typeof themeOrder[number]);
  return themeOrder[(currentIndex + 1) % themeOrder.length];
}

function ThemeIcon({ theme, resolvedTheme, className }: { theme: string | undefined; resolvedTheme: string | undefined; className?: string }) {
  if (theme === 'system') return <Monitor className={className} />;
  if (resolvedTheme === 'light') return <Sun className={className} />;
  return <Moon className={className} />;
}

export function ThemeSwitcher({ className, isBlur = true }: ThemeSwitcherProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={className}>
      <Button
        isIconOnly
        variant="light"
        size="sm"
        className={isBlur ? 'bg-foreground/10 dark:bg-foreground/20' : ''}
        onPress={() => setTheme(getNextTheme(theme))}>
        <ThemeIcon theme={theme} resolvedTheme={resolvedTheme} />
      </Button>
    </div>
  );
}

const themeLabels: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function SidebarThemeSwitcher({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return (
    <SidebarMenuButton
      onClick={() => setTheme(getNextTheme(theme))}
      className={className}>
      <ThemeIcon theme={theme} resolvedTheme={resolvedTheme} className="size-5" />
      <span>{themeLabels[theme || 'system']}</span>
    </SidebarMenuButton>
  );
}
