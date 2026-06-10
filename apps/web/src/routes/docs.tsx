import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/docs')({
  head: () => ({
    meta: [
      { title: 'Documentation - MultiPost' },
      {
        name: 'description',
        content: 'MultiPost documentation and guides for social media publishing.',
      },
    ],
  }),
  component: Outlet,
});
