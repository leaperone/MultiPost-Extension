'use client';

import { useCallback, useRef, useState } from 'react';
import {
  addToast,
  Button,
  Checkbox,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import {
  ArrowLeft,
  ExternalLink,
  ImagePlus,
  MessageSquarePlus,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

import { createConversation } from '@/actions/support';
import { SUPPORT_CATEGORY, SUPPORT_PRIORITY } from '@/actions/support/types';
import type { SupportCategory, SupportPriority } from '@/actions/support/types';
import { useTranslation } from '@/i18n/client';
import {
  collectBrowserInfo,
  compressDataUrlToBlob,
  compressImageToBlob,
  uploadSupportImage,
  getCategoryLabels,
} from '@/lib/support-utils';
import SupportTicketDetail from './SupportTicketDetail';
import SupportTicketList from './SupportTicketList';

// --- Constants ---

const TITLE_MAX = 200;
const CONTENT_MAX = 2000;

const FAQ_ITEMS = [
  { labelKey: 'faq.installExtension', href: 'https://multipost.app/install' },
  { labelKey: 'faq.publishMultiple', href: 'https://multipost.app/docs' },
  { labelKey: 'faq.creditsUsage', href: 'https://multipost.app/pricing' },
];

type View = 'home' | 'new' | 'detail';

// --- Component ---

interface SupportPanelProps {
  screenshot: string | null;
  onClose?: () => void;
}

export default function SupportPanel({ screenshot, onClose }: SupportPanelProps) {
  const { t } = useTranslation('support');
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const categoryLabels = getCategoryLabels(t);
  const priorityLabels: Record<SupportPriority, string> = {
    low: t('priority.low'),
    normal: t('priority.normal'),
    high: t('priority.high'),
    urgent: t('priority.urgent'),
  };

  // View navigation
  const [view, setView] = useState<View>('home');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // New ticket form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SupportCategory>('other');
  const [priority, setPriority] = useState<SupportPriority>('normal');
  const [content, setContent] = useState('');
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [manualImages, setManualImages] = useState<{ file: File; preview: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Navigation helpers ---

  const goHome = useCallback(() => {
    setView('home');
    setSelectedTicketId(null);
  }, []);

  const goNew = useCallback(() => {
    setView('new');
    setTitle('');
    setCategory('other');
    setPriority('normal');
    setContent('');
    setIncludeScreenshot(true);
    setManualImages([]);
  }, []);

  const goDetail = useCallback((ticketId: string) => {
    setSelectedTicketId(ticketId);
    setView('detail');
  }, []);

  // --- Manual image upload ---

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const newImages: { file: File; preview: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      newImages.push({ file, preview: URL.createObjectURL(file) });
    }

    setManualImages((prev) => [...prev, ...newImages].slice(0, 5));

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeManualImage = useCallback((index: number) => {
    setManualImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }, []);

  // --- Submit ---

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      addToast({ title: t('new.fillRequired'), hideIcon: true });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload screenshot if included
      let screenshotKey: string | undefined;
      if (includeScreenshot && screenshot) {
        const blob = await compressDataUrlToBlob(screenshot);
        screenshotKey = await uploadSupportImage(blob);
      }

      // Upload manual images
      const attachmentKeys: string[] = [];
      for (const img of manualImages) {
        const blob = await compressImageToBlob(img.file);
        const key = await uploadSupportImage(blob);
        attachmentKeys.push(key);
      }

      const browserInfo = collectBrowserInfo();

      const result = await createConversation({
        subject: title.trim(),
        category,
        priority,
        content: content.trim(),
        pageUrl: window.location.href,
        screenshotKey,
        attachmentKeys: attachmentKeys.length > 0 ? attachmentKeys : undefined,
        browserInfo,
      });

      if (result.success) {
        addToast({ title: t('new.submitted'), description: t('new.submittedHint'), hideIcon: true });
        // Navigate to the new ticket detail
        goDetail(result.conversationId);
      } else {
        addToast({ title: t('new.submitFailed'), description: result.error, hideIcon: true });
      }
    } catch (error) {
      console.error('Failed to submit support ticket:', error);
      addToast({ title: t('new.submitFailed'), description: t('new.retryHint'), hideIcon: true });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, content, category, priority, includeScreenshot, screenshot, manualImages, goDetail]);

  // --- Header ---

  const renderHeader = () => {
    const showBack = view !== 'home';
    const headerTitle =
      view === 'home' ? t('home.title') : view === 'new' ? t('new.title') : t('detail.title');

    return (
      <div className="flex items-center gap-2 border-b px-4 py-3">
        {showBack && (
          <button onClick={goHome} className="text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" />
          </button>
        )}
        <span className="flex-1 text-sm font-medium">{headerTitle}</span>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  };

  // --- Home View ---

  const renderHome = () => (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {/* Greeting */}
      <div>
        <h3 className="text-base font-semibold">{t('home.greeting')}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('home.greetingHint')}
        </p>
      </div>

      {/* New conversation button */}
      {isLoggedIn ? (
        <Button
          variant="solid"
          className="w-full"
          startContent={<MessageSquarePlus className="size-4" />}
          onPress={goNew}
        >
          {t('home.newConversation')}
        </Button>
      ) : (
        <a
          href="/signin"
          className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          {t('home.loginFirst')}
          <ExternalLink className="size-3" />
        </a>
      )}

      {/* FAQ */}
      <div>
        <h4 className="mb-2 text-xs font-medium text-muted-foreground">{t('home.faq')}</h4>
        <div className="flex flex-col gap-1">
          {FAQ_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
            >
              <span>{t(item.labelKey)}</span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </a>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      {isLoggedIn && (
        <div className="flex-1">
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">{t('home.history')}</h4>
          <SupportTicketList onSelect={goDetail} />
        </div>
      )}
    </div>
  );

  // --- New Ticket View ---

  const renderNew = () => (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {/* Title */}
      <Input
        label={t('new.subjectLabel')}
        placeholder={t('new.subjectPlaceholder')}
        value={title}
        onValueChange={(v) => setTitle(v.slice(0, TITLE_MAX))}
        description={`${title.length}/${TITLE_MAX}`}
        isRequired
        maxLength={TITLE_MAX}
      />

      {/* Category & Priority */}
      <div className="flex gap-2">
        <Select
          label={t('new.categoryLabel')}
          selectedKeys={[category]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0] as SupportCategory | undefined;
            if (val) setCategory(val);
          }}
          className="flex-1"
        >
          {Object.values(SUPPORT_CATEGORY).map((key) => (
            <SelectItem key={key}>{categoryLabels[key]}</SelectItem>
          ))}
        </Select>

        <Select
          label={t('new.priorityLabel')}
          selectedKeys={[priority]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0] as SupportPriority | undefined;
            if (val) setPriority(val);
          }}
          className="flex-1"
        >
          {Object.values(SUPPORT_PRIORITY).map((key) => (
            <SelectItem key={key}>{priorityLabels[key]}</SelectItem>
          ))}
        </Select>
      </div>

      {/* Content */}
      <Textarea
        label={t('new.contentLabel')}
        placeholder={t('new.contentPlaceholder')}
        value={content}
        onValueChange={(v) => setContent(v.slice(0, CONTENT_MAX))}
        description={`${content.length}/${CONTENT_MAX}`}
        isRequired
        maxLength={CONTENT_MAX}
        minRows={4}
      />

      {/* Screenshot option */}
      {screenshot && (
        <div className="flex flex-col gap-2">
          <Checkbox
            isSelected={includeScreenshot}
            onValueChange={setIncludeScreenshot}
            size="sm"
          >
            <span className="text-sm">{t('new.includeScreenshot')}</span>
          </Checkbox>
          {includeScreenshot && (
            <div className="relative inline-block w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshot}
                alt="screenshot preview"
                className="max-h-28 rounded border object-contain"
              />
            </div>
          )}
        </div>
      )}

      {/* Manual image upload */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="flat"
            size="sm"
            startContent={<ImagePlus className="size-4" />}
            onPress={() => fileInputRef.current?.click()}
            isDisabled={manualImages.length >= 5}
          >
            {t('new.uploadImage')}
          </Button>
          <span className="text-xs text-muted-foreground">{manualImages.length}/5</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {manualImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {manualImages.map((img, idx) => (
              <div key={idx} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt={`attachment ${idx + 1}`}
                  className="size-16 rounded border object-cover"
                />
                <button
                  onClick={() => removeManualImage(idx)}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-foreground/80 p-0.5 text-background transition-colors hover:bg-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        variant="solid"
        className="mt-auto w-full"
        onPress={handleSubmit}
        isLoading={isSubmitting}
        isDisabled={!title.trim() || !content.trim() || isSubmitting}
      >
        {isSubmitting ? t('new.submitting') : t('new.submitTicket')}
      </Button>
    </div>
  );

  // --- Detail View ---

  const renderDetail = () => {
    if (!selectedTicketId) return null;
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <SupportTicketDetail conversationId={selectedTicketId} onBack={goHome} />
      </div>
    );
  };

  // --- Render ---

  return (
    <div className="fixed right-5 bottom-20 z-50 flex h-[540px] w-[380px] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
      {renderHeader()}
      {view === 'home' && renderHome()}
      {view === 'new' && renderNew()}
      {view === 'detail' && renderDetail()}
    </div>
  );
}
