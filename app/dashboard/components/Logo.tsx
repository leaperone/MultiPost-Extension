'use client';

import { Button, cn, Link } from "@heroui/react";

import { useSidebar } from '@/components/ui/sidebar';

const MultiPostLogo = () => {
  const { open } = useSidebar();
  return (
    <div>
      <Button
        as={Link}
        href="/"
        variant="light"
        className={cn('mx-auto', open ? '' : 'hidden')}
        fullWidth>
        <span className="bg-gradient-to-br from-blue-300 to-pink-600 bg-clip-text font-semibold text-transparent dark:from-blue-400 dark:to-pink-400">
          MultiPost
        </span>
      </Button>
    </div>
  );
};

export default MultiPostLogo;
