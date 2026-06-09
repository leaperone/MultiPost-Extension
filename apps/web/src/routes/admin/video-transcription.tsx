import { Chip } from '@heroui/react';
import { createFileRoute } from '@tanstack/react-router';

import {
  getTranscriptionStats,
  getVideoTranscriptions,
} from '../../actions/admin/video-transcription';
import { useTranslation } from '../../i18n/client';
import TranscriptionTable from './video-transcription/-components/TranscriptionTable';
import { TranscriptionStats } from './video-transcription/-components/TranscriptionStats';

export const Route = createFileRoute('/admin/video-transcription')({
  loader: async () => {
    const [transcriptionResp, statsResp] = await Promise.all([
      getVideoTranscriptions({ data: {} }),
      getTranscriptionStats({ data: {} }),
    ]);
    return { transcriptionResp, statsResp };
  },
  component: AdminVideoTranscriptionPage,
});

function AdminVideoTranscriptionPage() {
  const { t } = useTranslation('admin');
  const { transcriptionResp, statsResp } = Route.useLoaderData();

  if (transcriptionResp.code !== 0) {
    return <div>{transcriptionResp.msg}</div>;
  }

  if (statsResp.code !== 0) {
    return <div>{statsResp.msg}</div>;
  }

  const count = transcriptionResp.data.count;
  const stats = statsResp.data;

  return (
    <div className="flex size-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{t('transcription.title')}</h1>
          <Chip color="primary">{count}</Chip>
        </div>
      </div>

      <TranscriptionStats
        total={stats.total}
        completed={stats.completed}
        processing={stats.processing}
        failed={stats.failed}
        uniqueUsers={stats.uniqueUsers}
      />

      <TranscriptionTable />
    </div>
  );
}
