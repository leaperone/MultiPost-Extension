'use client';

import { Button } from '@heroui/react';
import { HomeIcon, RefreshCwIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Oops, something went wrong!
        </h1>
        <p className="mt-4 text-muted-foreground">
          We&apos;re sorry, an unexpected error occurred. Please try again later or contact support if the issue
          persists.
        </p>
        <div className="mt-6">
          <Button
            as={Link}
            href="/"
            startContent={<HomeIcon />}
            prefetch={false}
            color="primary">
            Homepage
          </Button>

          <Button
            onPress={() => reset()}
            color="secondary"
            startContent={<RefreshCwIcon />}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
