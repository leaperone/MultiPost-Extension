import { createFileRoute } from '@tanstack/react-router';

import DynamicPublishPage from '../../../../../app/dashboard/desktop/publish/dynamic/page';

export const Route = createFileRoute('/dashboard/desktop/publish/dynamic')({
  component: DynamicPublishPage,
});
