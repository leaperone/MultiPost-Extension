import { createFileRoute, redirect } from '@tanstack/react-router';

import { DEFAULT_DOCS_LANG } from '../../lib/docs-i18n';

export const Route = createFileRoute('/docs/')({
  beforeLoad: () => {
    throw redirect({
      href: `/docs/${DEFAULT_DOCS_LANG}`,
      statusCode: 302,
    });
  },
});
