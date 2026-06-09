import { Button, cn } from '@heroui/react';
import { Link } from '@tanstack/react-router';

import { useSidebar } from '@/components/ui/sidebar';

export default function MultiPostLogo() {
  const { open } = useSidebar();

  return (
    <div>
      <Link to="/">
        <Button
          variant="light"
          className={cn('mx-auto', open ? '' : 'hidden')}
          fullWidth>
          <span className="bg-gradient-to-br from-blue-300 to-pink-600 bg-clip-text font-semibold text-transparent dark:from-blue-400 dark:to-pink-400">
            MultiPost
          </span>
        </Button>
      </Link>
    </div>
  );
}
