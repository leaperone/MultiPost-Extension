'use client';

import { Button } from '@heroui/react';
import { CodeXmlIcon } from 'lucide-react';
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
        size="lg"
        variant="bordered"
        startContent={<CodeXmlIcon className="size-5" />}
        onPress={() => setIsOpen(true)}>
        添加跟踪代码
      </Button>
      <ScriptExampleModal
        websiteId={websiteId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
