import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

import { SidebarMenuButton } from '@/components/ui/sidebar';

const themeOrder = ['light', 'dark', 'system'] as const;

const themeLabels: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

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
  if (theme === 'system') return <Monitor className="size-5" />;
  if (resolvedTheme === 'light') return <Sun className="size-5" />;
  return <Moon className="size-5" />;
}

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
      <ThemeIcon
        theme={theme}
        resolvedTheme={resolvedTheme}
      />
      <span>{themeLabels[theme || 'system']}</span>
    </SidebarMenuButton>
  );
}
