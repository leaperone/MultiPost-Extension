import { createFileRoute } from '@tanstack/react-router';

import VideoPublishPage from '../../../../../app/dashboard/desktop/publish/video/page';

export const Route = createFileRoute('/dashboard/desktop/publish/video')({
  component: VideoPublishPage,
});
