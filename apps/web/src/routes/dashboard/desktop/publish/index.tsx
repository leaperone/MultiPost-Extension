import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/desktop/publish/')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/desktop/publish/dynamic',
      statusCode: 302,
    });
  },
});
