'use client';

import { Button } from '@heroui/react';
import { useState } from 'react';

interface CommunityContactProps {
  qqGroupNumber: string;
  joinText: string;
  copyText: string;
  qqLabel: string;
}

export default function CommunityContact({ qqGroupNumber, joinText, copyText, qqLabel }: CommunityContactProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(qqGroupNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="flex flex-col items-center space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0">
        <span className="font-semibold">{qqLabel}：</span>
        <div className="group relative">
          <span className="text-lg">{qqGroupNumber}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            onClick={handleCopy}>
            {copied ? '已复制✓' : copyText}
          </Button>
        </div>
      </div>

      <Button
        variant="ghost"
        className="mt-4 rounded-full bg-background/50 px-6 backdrop-blur-sm hover:bg-background/80"
        onClick={() =>
          window.open(
            `https://qm.qq.com/cgi-bin/qm/qr?k=oLmJfZ4fDX57d3f2KxiYO3UPYvKQHpr_&jump_from=webapi&authKey=MhYchsgbIHtjcbfGD3rjpplY3jlZvBur0fHA4ahzSFMYFrAXnZ+rR3pKBKdh+b9v`,
            '_blank',
          )
        }>
        {joinText}
      </Button>
    </div>
  );
}
