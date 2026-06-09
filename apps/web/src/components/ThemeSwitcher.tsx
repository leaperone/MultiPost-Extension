import { Button } from '@heroui/react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeSwitcherProps {
  className?: string;
  isBlur?: boolean;
}

const themeOrder = ['light', 'dark', 'system'] as const;

function getNextTheme(current: string | undefined) {
  const currentIndex = themeOrder.indexOf(current as (typeof themeOrder)[number]);
  return themeOrder[(currentIndex + 1) % themeOrder.length];
}

function ThemeIcon({
  theme,
  resolvedTheme,
}: {
  theme: string | undefined;
  resolvedTheme: string | undefined;
}) {
  if (theme === 'system') return <Monitor />;
  if (resolvedTheme === 'light') return <Sun />;
  return <Moon />;
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
        onPress={() => setTheme(getNextTheme(theme))}
        aria-label="Switch theme">
        <ThemeIcon
          theme={theme}
          resolvedTheme={resolvedTheme}
        />
      </Button>
    </div>
  );
}
