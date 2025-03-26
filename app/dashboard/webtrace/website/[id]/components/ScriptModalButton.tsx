'use client';

import { Button } from '@heroui/react';
import { Code } from 'lucide-react';
import { useState } from 'react';
import { ScriptExampleModal } from './ScriptExampleModal';

interface ScriptModalButtonProps {
  websiteId: string;
}

export function ScriptModalButton({ websiteId }: ScriptModalButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        size="md"
        className="w-full sm:w-auto"
        variant="bordered"
        onPress={() => setIsOpen(true)}>
        <Code className="mr-2 size-4" />
        <span className="sm:inline">查看跟踪代码</span>
      </Button>
      <ScriptExampleModal
        websiteId={websiteId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
