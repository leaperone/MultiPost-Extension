import { Button } from '@heroui/react';
import { Link, type ErrorComponentProps } from '@tanstack/react-router';
import * as Sentry from '@sentry/core';
import { HomeIcon, RefreshCwIcon } from 'lucide-react';
import { useEffect } from 'react';

export function SentryRouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    Sentry.captureException(error);
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
        <div className="mx-auto mt-6 flex w-fit flex-row gap-4">
          <Button
            as={Link}
            to="/"
            startContent={<HomeIcon />}
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
