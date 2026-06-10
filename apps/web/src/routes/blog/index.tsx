import { createFileRoute, redirect } from '@tanstack/react-router';

import { DEFAULT_BLOG_LANG } from '../../lib/blog-i18n';

export const Route = createFileRoute('/blog/')({
  beforeLoad: () => {
    throw redirect({
      href: `/blog/${DEFAULT_BLOG_LANG}`,
      statusCode: 302,
    });
  },
});
