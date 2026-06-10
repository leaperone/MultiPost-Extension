import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/blog')({
  head: () => ({
    meta: [
      { title: 'Blog - MultiPost' },
      {
        name: 'description',
        content:
          'Latest articles, tutorials, and updates about social media publishing and MultiPost features.',
      },
    ],
  }),
  component: Outlet,
});
