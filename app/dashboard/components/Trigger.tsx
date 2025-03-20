'use client';

import { cn } from '@heroui/react';
import { PanelLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { useTranslation } from '@/i18n/client';

const DashboardSiderBarTrigger = () => {
  const { open, toggleSidebar, isMobile } = useSidebar();
  const { t } = useTranslation('dashboard');

  // 移动端侧栏, don't need this btn.
  if (isMobile) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size={open ? 'sm' : 'icon'}
      className="w-full justify-start p-2"
      onClick={toggleSidebar}>
      <PanelLeft className="my-auto size-4" />
      <span className={cn('ml-2', open ? '' : 'hidden')}>{t('sidebar.collapse')}</span>
    </Button>
  );
};

export default DashboardSiderBarTrigger;
