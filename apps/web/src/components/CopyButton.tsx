'use client';

import { CopyCheckIcon, CopyIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  return (
    <Button
      isIconOnly
      variant="light"
      size="sm"
      onPress={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
      }}>
      {copied ? <CopyCheckIcon className="size-4 text-success-500" /> : <CopyIcon className="size-4" />}
    </Button>
  );
}
