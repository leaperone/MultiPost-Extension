'use client';

import { useTranslation } from '@/i18n/client';
import { Button } from '@heroui/react';
import { Code } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { getTaskHtml } from '@/actions/draw/poster';

export function ExportHtmlButton({ id }: { id: string }) {
  const { t } = useTranslation('poster');
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await getTaskHtml(id);
      if (!result.success || !result.data) {
        throw new Error(result.error || t('result_waiter.unknown_error'));
      }

      const blob = new Blob([result.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `poster-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t('export.success'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('export.failed'));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="bordered"
      onPress={handleExport}
      isLoading={isExporting}
      isDisabled={isExporting}
      startContent={!isExporting && <Code className="size-4" />}>
      {t('export.html')}
    </Button>
  );
}
