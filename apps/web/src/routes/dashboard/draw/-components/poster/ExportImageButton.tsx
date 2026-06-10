'use client';

import { useTranslation } from '@/src/i18n/client';
import { Button, Popover, PopoverTrigger, PopoverContent, Select, SelectItem, Slider } from '@heroui/react';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EXPORT_FORMATS, type ExportFormat } from '../../../../../actions/draw/poster/types';

export function ExportImageButton() {
  const { t } = useTranslation('poster');
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(1.0);
  const [dpr, setDpr] = useState(2);

  function exportImage() {
    setIsExporting(true);

    const iframe = document.querySelector('iframe');

    if (!iframe?.contentWindow) {
      toast.error(t('export.canvas_not_found'));
      setIsExporting(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      toast.error(t('export.timeout'));
      setIsExporting(false);
    }, 15000);

    function messageHandler(event: MessageEvent) {
      if (!event.origin.endsWith('seede.ai')) return;
      if (event.data.type === 'export-image-result') {
        clearTimeout(timeoutId);
        const { success, data, error } = event.data.payload;

        if (success && data) {
          const link = document.createElement('a');
          link.href = data;
          link.download = `poster-${new Date().toISOString().slice(0, 10)}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(t('export.success'));
        } else {
          toast.error(`${t('export.failed')}: ${error || t('result_waiter.unknown_error')}`);
        }

        window.removeEventListener('message', messageHandler);
        setIsExporting(false);
      }
    }

    window.addEventListener('message', messageHandler);

    try {
      iframe.contentWindow!.postMessage(
        {
          type: 'export-image',
          payload: {
            format,
            quality,
            dpr,
            frameIndex: 0,
          },
        },
        'https://seede.ai',
      );
    } catch (err) {
      clearTimeout(timeoutId);
      window.removeEventListener('message', messageHandler);
      toast.error(t('export.comm_error'));
      setIsExporting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Popover placement="bottom">
        <PopoverTrigger>
          <Button
            size="sm"
            variant="bordered">
            {t('export.options')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] space-y-4 p-4">
          <Select
            label={t('export.format')}
            size="sm"
            selectedKeys={[format]}
            onSelectionChange={(keys) => setFormat(Array.from(keys)[0] as ExportFormat)}>
            {EXPORT_FORMATS.map((fmt) => (
              <SelectItem key={fmt}>{fmt.toUpperCase()}</SelectItem>
            ))}
          </Select>
          <div>
            <Slider
              label={t('export.quality')}
              size="sm"
              step={0.1}
              minValue={0.1}
              maxValue={1.0}
              value={quality}
              onChange={(v) => setQuality(v as number)}
            />
          </div>
          <Select
            label={t('export.dpr')}
            size="sm"
            selectedKeys={[dpr.toString()]}
            onSelectionChange={(keys) => setDpr(parseInt(Array.from(keys)[0] as string))}>
            {[1, 2, 3, 4].map((d) => (
              <SelectItem key={d.toString()}>{`${d}x`}</SelectItem>
            ))}
          </Select>
        </PopoverContent>
      </Popover>
      <Button
        onPress={exportImage}
        isLoading={isExporting}
        isDisabled={isExporting}
        startContent={!isExporting && <Download className="size-4" />}>
        {isExporting ? t('result_waiter.exporting') : t('result_waiter.download')}
      </Button>
    </div>
  );
}
