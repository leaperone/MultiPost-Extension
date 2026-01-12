import { Button, Link } from '@heroui/react';
import { VideoIcon, ArrowRight } from 'lucide-react';

interface FeatureAnnouncementBannerProps {
  text: string;
  cta: string;
}

/**
 * Temporary feature announcement banner for Video Transcription launch.
 * TODO: Remove this component after 2026-03 when the promotion period ends.
 */
export function FeatureAnnouncementBanner({ text, cta }: FeatureAnnouncementBannerProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm dark:border-rose-800 dark:bg-rose-950/50">
      <VideoIcon className="size-4 text-rose-500" />
      <span className="text-rose-700 dark:text-rose-300">{text}</span>
      <Link href="/dashboard/video-transcribe">
        <Button
          size="sm"
          variant="flat"
          color="danger"
          endContent={<ArrowRight className="size-3" />}>
          {cta}
        </Button>
      </Link>
    </div>
  );
}
