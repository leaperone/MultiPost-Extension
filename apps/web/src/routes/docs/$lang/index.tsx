import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/docs/$lang/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      href: `/docs/${params.lang}/user-guide`,
      statusCode: 302,
    });
  },
});
