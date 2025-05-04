'use client'; // Error components must be Client Components

import { Button } from '@heroui/react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        {/* <img
          src="/placeholder.svg"
          width={200}
          height={200}
          alt="错误插图"
          className="mx-auto"
        /> */}
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">哎呀，出错了！</h1>
        <p className="mt-4 text-muted-foreground">很抱歉，发生了意外错误。请稍后再试，如果问题仍然存在，请联系支持。</p>
        <div className="mt-6">
          <Link
            href="#"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            prefetch={false}>
            前往首页
          </Link>

          <Button onPress={() => reset()}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
