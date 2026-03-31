'use server';

import { Chip } from '@heroui/react';
import { getVideoTranscriptions, getTranscriptionStats } from './actions';
import { TranscriptionStats } from './components/TranscriptionStats';
import TranscriptionTable from './components/TranscriptionTable';
import { createTranslation } from '@/i18n/server';

async function AdminVideoTranscriptionPage() {
  const { t } = await createTranslation('admin');
  const [transcriptionResp, statsResp] = await Promise.all([getVideoTranscriptions(), getTranscriptionStats()]);

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

export default AdminVideoTranscriptionPage;
