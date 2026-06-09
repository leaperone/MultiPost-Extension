import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/draw/')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/draw/image',
      statusCode: 302,
    });
  },
});
