import { createFileRoute } from '@tanstack/react-router';

import ArticlePublishPage from '../../../../../app/dashboard/desktop/publish/article/page';

export const Route = createFileRoute('/dashboard/desktop/publish/article')({
  component: ArticlePublishPage,
});
