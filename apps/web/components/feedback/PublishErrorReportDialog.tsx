'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addToast,
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import { MegaphoneIcon, UploadCloudIcon, XIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { useTranslation } from '@/i18n/client';
import { reportPublishError } from '../../src/actions/feedback/report-publish-error';
import { getFeedbackUploadUrl } from '../../src/actions/feedback/upload';
import {
  ERROR_TYPES,
  FEEDBACK_SOURCES,
  type ErrorType,
  type FeedbackSource,
} from '../../src/actions/feedback/types';

const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export interface PublishErrorReportContext {
  platform?: string;
  taskId?: string;
  logId?: string;
  status?: string;
  errorMessage?: string;
  source: FeedbackSource;
}

interface PublishErrorReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  context: PublishErrorReportContext;
}

// Keep this list in sync with the desktop platform adapters. We intentionally
// inline it here rather than depend on @multipost/shared to avoid an extra
// workspace dep for a small UI form. Display names are localized only loosely
// (we show the canonical brand name).
const PLATFORM_OPTIONS: Array<{ id: string; name: string }> = [
  { id: 'weibo', name: '微博' },
  { id: 'xiaohongshu', name: '小红书' },
  { id: 'twitter', name: 'Twitter / X' },
  { id: 'douyin', name: '抖音' },
  { id: 'bilibili', name: 'B 站' },
  { id: 'zhihu', name: '知乎' },
  { id: 'wechat', name: '微信公众号' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'threads', name: 'Threads' },
  { id: 'bluesky', name: 'Bluesky' },
  { id: 'mastodon', name: 'Mastodon' },
  { id: 'reddit', name: 'Reddit' },
  { id: 'medium', name: 'Medium' },
  { id: 'devto', name: 'dev.to' },
  { id: 'pinterest', name: 'Pinterest' },
  { id: 'other', name: 'Other / Not listed' },
];

const ERROR_TYPE_KEYS: Array<{ value: ErrorType; key: string }> = [
  { value: ERROR_TYPES.CANNOT_PUBLISH, key: 'cannotPublish' },
  { value: ERROR_TYPES.CONTENT_MISSING, key: 'contentMissing' },
  { value: ERROR_TYPES.ACCOUNT_ISSUE, key: 'accountIssue' },
  { value: ERROR_TYPES.OTHER, key: 'other' },
];

export default function PublishErrorReportDialog({
  isOpen,
  onClose,
  context,
}: PublishErrorReportDialogProps) {
  const { t } = useTranslation('feedback');

  const [platform, setPlatform] = useState<string>(context.platform ?? '');
  const [errorType, setErrorType] = useState<ErrorType>(ERROR_TYPES.CANNOT_PUBLISH);
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPlatform(context.platform ?? '');
      setErrorType(ERROR_TYPES.CANNOT_PUBLISH);
      setDescription('');
      setScreenshot(null);
    }
  }, [isOpen, context.platform]);

  const platformOptions = useMemo(() => {
    return [...PLATFORM_OPTIONS].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setScreenshot(null);
        return;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        addToast({
          title: t('toast.uploadFailureTitle'),
          description: t('validation.screenshotInvalidType'),
          hideIcon: true,
        });
        return;
      }
      if (file.size > MAX_SCREENSHOT_BYTES) {
        addToast({
          title: t('toast.uploadFailureTitle'),
          description: t('validation.screenshotTooLarge'),
          hideIcon: true,
        });
        return;
      }
      setScreenshot(file);
    },
    [t],
  );

  const uploadScreenshot = useCallback(async (file: File): Promise<string | undefined> => {
    const result = await getFeedbackUploadUrl({
      data: {
        filename: file.name,
      },
    });
    if (!result.success || !result.uploadUrl || !result.key) {
      throw new Error(result.error ?? 'Upload URL unavailable');
    }
    const putRes = await fetch(result.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error(`Upload failed with status ${putRes.status}`);
    }
    return result.key;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (description.trim().length === 0) {
      addToast({
        title: t('toast.failureTitle'),
        description: t('validation.descriptionRequired'),
        hideIcon: true,
      });
      return;
    }

    setIsSubmitting(true);
    let screenshotKey: string | undefined;

    if (screenshot) {
      try {
        screenshotKey = await uploadScreenshot(screenshot);
      } catch {
        addToast({
          title: t('toast.uploadFailureTitle'),
          description: t('toast.uploadFailureDescription'),
          hideIcon: true,
        });
      }
    }

    try {
      const result = await reportPublishError({
        data: {
          platform: platform || undefined,
          taskId: context.taskId,
          logId: context.logId,
          status: context.status,
          errorMessage: context.errorMessage,
          description: description.trim(),
          errorType,
          source: context.source,
          screenshotKey,
          page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        },
      });

      if (result.ok) {
        addToast({
          title: t('toast.successTitle'),
          description: t('toast.successDescription'),
          hideIcon: true,
        });
        onClose();
      } else {
        addToast({
          title: t('toast.failureTitle'),
          description: result.error ?? t('toast.failureDescription'),
          hideIcon: true,
        });
      }
    } catch {
      addToast({
        title: t('toast.failureTitle'),
        description: t('toast.failureDescription'),
        hideIcon: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    description,
    errorType,
    platform,
    screenshot,
    context.taskId,
    context.logId,
    context.status,
    context.errorMessage,
    context.source,
    uploadScreenshot,
    onClose,
    t,
  ]);

  const hasContextInfo = Boolean(context.taskId || context.logId || context.status || context.errorMessage);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <MegaphoneIcon className="size-5" />
          <span>{t('modal.title')}</span>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground/70">{t('modal.intro')}</p>

          <Select
            label={t('modal.platformLabel')}
            placeholder={t('modal.platformPlaceholder')}
            selectedKeys={platform ? [platform] : []}
            isDisabled={Boolean(context.platform)}
            onSelectionChange={(keys) => {
              const next = Array.from(keys)[0];
              if (typeof next === 'string') setPlatform(next);
            }}>
            {platformOptions.map((p) => (
              <SelectItem key={p.id}>{p.name}</SelectItem>
            ))}
          </Select>

          <Select
            label={t('modal.errorTypeLabel')}
            placeholder={t('modal.errorTypePlaceholder')}
            selectedKeys={[errorType]}
            onSelectionChange={(keys) => {
              const next = Array.from(keys)[0];
              if (typeof next === 'string') setErrorType(next as ErrorType);
            }}>
            {ERROR_TYPE_KEYS.map((item) => (
              <SelectItem key={item.value}>{t(`errorType.${item.key}`)}</SelectItem>
            ))}
          </Select>

          <Textarea
            label={t('modal.descriptionLabel')}
            placeholder={t('modal.descriptionPlaceholder')}
            value={description}
            maxLength={2000}
            minRows={4}
            onValueChange={setDescription}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">{t('modal.screenshotLabel')}</p>
            <p className="text-xs text-foreground/60">{t('modal.screenshotHint')}</p>
            {screenshot ? (
              <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span className="truncate">{screenshot.name}</span>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  aria-label={t('modal.screenshotRemove')}
                  onPress={() => setScreenshot(null)}>
                  <XIcon className="size-4" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-foreground/70 hover:bg-default-100">
                <UploadCloudIcon className="size-4" />
                <span>{t('modal.screenshotLabel')}</span>
                <input
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          {hasContextInfo && (
            <div className="rounded-md border bg-default-50 p-3 text-xs text-foreground/70">
              <p className="mb-1 font-medium text-foreground/80">{t('modal.contextLabel')}</p>
              <div className="space-y-1">
                {context.taskId && (
                  <div className="flex items-center gap-2">
                    <Chip size="sm" variant="flat">{t('modal.contextTaskId')}</Chip>
                    <span className="truncate">{context.taskId}</span>
                  </div>
                )}
                {context.logId && (
                  <div className="flex items-center gap-2">
                    <Chip size="sm" variant="flat">{t('modal.contextLogId')}</Chip>
                    <span className="truncate">{context.logId}</span>
                  </div>
                )}
                {context.status && (
                  <div className="flex items-center gap-2">
                    <Chip size="sm" variant="flat">{t('modal.contextStatus')}</Chip>
                    <span>{context.status}</span>
                  </div>
                )}
                {context.errorMessage && (
                  <div className="flex items-start gap-2">
                    <Chip size="sm" variant="flat">{t('modal.contextError')}</Chip>
                    <span className="line-clamp-3 text-foreground/80">{context.errorMessage}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-foreground/60">{t('modal.anonymousNote')}</p>
        </ModalBody>
        <ModalFooter className="flex items-center justify-between">
          <p className="text-xs text-foreground/60">
            {t('modal.contributeHint')}{' '}
            <Link
              to="/community"
              target="_blank"
              className="underline">
              {t('modal.contributeLink')}
            </Link>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="light" onPress={onClose} isDisabled={isSubmitting}>
              {t('modal.cancel')}
            </Button>
            <Button color="primary" onPress={handleSubmit} isLoading={isSubmitting}>
              {isSubmitting ? t('modal.submitting') : t('modal.submit')}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export { FEEDBACK_SOURCES };
