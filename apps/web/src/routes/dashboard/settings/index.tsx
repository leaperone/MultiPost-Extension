import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/settings/')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/settings/general',
      statusCode: 302,
    });
  },
});
