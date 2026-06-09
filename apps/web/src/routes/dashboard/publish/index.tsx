import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/publish/')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/publish/dynamic',
      statusCode: 302,
    });
  },
});
