'use client';

import { useTranslation } from '@/i18n/client';
import { Button } from '@heroui/react';
import { useState } from 'react';
import { toast } from 'sonner';

export function ExportImageButton() {
  const { t } = useTranslation('poster');
  const [isExporting, setIsExporting] = useState(false);

  function exportImage() {
    console.log('Initiating image export');
    setIsExporting(true);

    const iframe = document.querySelector('iframe');

    if (!iframe) {
      console.error('Iframe not found');
      toast.error('无法找到海报画布');
      setIsExporting(false);
      return;
    }

    if (!iframe.contentWindow) {
      console.error('ContentWindow not accessible');
      toast.error('无法访问海报画布');
      setIsExporting(false);
      return;
    }

    // 确保iframe已加载
    if (iframe.contentDocument?.readyState !== 'complete') {
      console.log('Iframe not fully loaded, waiting...');
      toast.warning('海报画布正在加载中，请稍候再试');
      setIsExporting(false);
      return;
    }

    // 设置超时，确保不会永远等待响应
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      console.error('Export timeout');
      toast.error('导出超时，请重试');
      setIsExporting(false);
    }, 10000);

    // 处理iframe返回的消息
    function messageHandler(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return; // 安全检查：只接受来自同源的消息
      }

      if (event.data.type === 'export-image-result') {
        clearTimeout(timeoutId);
        const { success, data, error } = event.data.payload;

        if (success && data) {
          console.log(`Successfully exported image`);
          // 下载图片
          const link = document.createElement('a');
          link.href = data;
          link.download = `poster-${new Date().toISOString().slice(0, 10)}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success('海报导出成功');
        } else {
          console.error('Failed to export image:', error);
          toast.error(`导出失败: ${error || '未知错误'}`);
        }

        // 移除事件监听器
        window.removeEventListener('message', messageHandler);
        setIsExporting(false);
      }
    }

    // 添加事件监听器
    window.addEventListener('message', messageHandler);

    // 尝试向iframe发送消息
    try {
      iframe.contentWindow.postMessage(
        {
          type: 'export-image',
          payload: {
            format: 'png',
            frameIndex: 0,
          },
        },
        window.location.origin,
      );
      console.log('Export message sent to iframe');
    } catch (err) {
      clearTimeout(timeoutId);
      window.removeEventListener('message', messageHandler);
      console.error('Failed to send message to iframe:', err);
      toast.error('无法与海报画布通信');
      setIsExporting(false);
    }
  }

  return (
    <Button
      onPress={exportImage}
      isLoading={isExporting}
      isDisabled={isExporting}>
      {isExporting ? t('result_waiter.exporting') : t('result_waiter.download')}
    </Button>
  );
}
