'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Input,
  Textarea,
  addToast,
} from '@heroui/react';
import { MessageSquare, X } from 'lucide-react';
import { useTranslation } from '@/i18n/client';
import { submitFeedback } from '@/actions/feedback';
import { FEEDBACK_CATEGORIES, CONTACT_METHODS, type FeedbackCategory, type ContactMethod } from '@/actions/feedback/types';
import { useAppStore } from '@/store/app.store';
import { useSession } from 'next-auth/react';

const TITLE_MAX = 200;
const CONTENT_MAX = 2000;

export function FeedbackButton() {
  const { t } = useTranslation('feedback');
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethod | ''>('');
  const [contactValue, setContactValue] = useState('');

  const screenshotRef = useRef<string | null>(null);
  const [hasScreenshot, setHasScreenshot] = useState(false);

  const resetForm = useCallback(() => {
    setCategory('');
    setTitle('');
    setContent('');
    setContactMethod('');
    setContactValue('');
    screenshotRef.current = null;
    setHasScreenshot(false);
  }, []);

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const canvas = await html2canvas(document.body, {
        ignoreElements: (el) => el.hasAttribute('data-feedback-trigger'),
        useCORS: true,
        logging: false,
      });

      // Scale down to max 1280px wide, then JPEG compress
      const MAX_WIDTH = 1280;
      let srcCanvas: HTMLCanvasElement = canvas;
      if (canvas.width > MAX_WIDTH) {
        const scale = MAX_WIDTH / canvas.width;
        const scaled = document.createElement('canvas');
        scaled.width = MAX_WIDTH;
        scaled.height = Math.round(canvas.height * scale);
        const ctx = scaled.getContext('2d');
        ctx?.drawImage(canvas, 0, 0, scaled.width, scaled.height);
        srcCanvas = scaled;
      }

      let quality = 0.7;
      let dataUrl = srcCanvas.toDataURL('image/jpeg', quality);

      if (dataUrl.length > 500_000) {
        quality = 0.4;
        dataUrl = srcCanvas.toDataURL('image/jpeg', quality);
      }

      screenshotRef.current = dataUrl;
      setHasScreenshot(true);
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      addToast({
        title: t('toast.screenshotFailed.title'),
        description: t('toast.screenshotFailed.description'),
        color: 'warning',
      });
    } finally {
      setIsCapturing(false);
    }
  }, [t]);

  const handleOpen = useCallback(async () => {
    // Pre-fill email from session if available
    if (session?.user?.email && !contactMethod && !contactValue) {
      setContactMethod('email');
      setContactValue(session.user.email);
    }
    await captureScreenshot();
    setIsOpen(true);
  }, [captureScreenshot, session, contactMethod, contactValue]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resetForm();
  }, [resetForm]);

  const removeScreenshot = useCallback(() => {
    screenshotRef.current = null;
    setHasScreenshot(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!category || !title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const appState = useAppStore.getState().collectAppState();
      const browserInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenSize: `${screen.width}x${screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio,
      };

      const result = await submitFeedback({
        category,
        title: title.trim(),
        content: content.trim(),
        contactMethod: contactMethod || undefined,
        contactValue: contactValue.trim() || undefined,
        screenshot: screenshotRef.current ?? undefined,
        browserInfo: JSON.stringify(browserInfo),
        appState: JSON.stringify(appState),
        pageUrl: window.location.href,
      });

      if (result.success) {
        addToast({
          title: t('toast.success.title'),
          description: t('toast.success.description'),
          color: 'success',
        });
        handleClose();
      } else {
        addToast({
          title: t('toast.error.title'),
          description: result.message ?? t('toast.error.description'),
          color: 'danger',
        });
      }
    } catch {
      addToast({
        title: t('toast.error.title'),
        description: t('toast.error.description'),
        color: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [category, title, content, contactMethod, contactValue, t, handleClose]);

  const categoryItems = Object.values(FEEDBACK_CATEGORIES);
  const contactItems = Object.values(CONTACT_METHODS);

  return (
    <>
      {/* Floating trigger button */}
      <button
        data-feedback-trigger
        onClick={handleOpen}
        disabled={isCapturing}
        className="fixed right-0 bottom-6 z-40 flex cursor-pointer items-center gap-1 rounded-l-lg border border-r-0 bg-background/60 px-1 py-1.5 text-foreground/60 backdrop-blur-sm transition-colors hover:bg-background/80 hover:text-foreground"
        style={{ writingMode: 'vertical-rl' }}>
        <MessageSquare className="size-3.5 shrink-0" />
        <span className="text-xs leading-tight tracking-wide">{t('trigger')}</span>
      </button>

      {/* Feedback Modal */}
      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        size="lg"
        placement="center"
        backdrop="blur"
        scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{t('modal.title')}</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-4">
              {/* Category */}
              <Select
                label={t('modal.category.label')}
                placeholder={t('modal.category.placeholder')}
                selectedKeys={category ? [category] : []}
                onSelectionChange={(keys) => {
                  const val = Array.from(keys)[0] as FeedbackCategory;
                  setCategory(val ?? '');
                }}
                isRequired>
                {categoryItems.map((key) => (
                  <SelectItem key={key}>{t(`modal.category.${key}`)}</SelectItem>
                ))}
              </Select>

              {/* Title */}
              <Input
                label={t('modal.titleField.label')}
                placeholder={t('modal.titleField.placeholder')}
                value={title}
                onValueChange={(v) => setTitle(v.slice(0, TITLE_MAX))}
                description={t('modal.titleField.counter', { count: title.length, max: TITLE_MAX })}
                isRequired
                maxLength={TITLE_MAX}
              />

              {/* Content */}
              <Textarea
                label={t('modal.content.label')}
                placeholder={t('modal.content.placeholder')}
                value={content}
                onValueChange={(v) => setContent(v.slice(0, CONTENT_MAX))}
                description={t('modal.content.counter', { count: content.length, max: CONTENT_MAX })}
                isRequired
                maxLength={CONTENT_MAX}
                minRows={4}
              />

              {/* Contact (optional) */}
              <div className="flex gap-2">
                <Select
                  label={t('modal.contact.label')}
                  placeholder={t('modal.contact.methodPlaceholder')}
                  selectedKeys={contactMethod ? [contactMethod] : []}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0] as ContactMethod;
                    setContactMethod(val ?? '');
                  }}
                  className="w-1/3">
                  {contactItems.map((key) => (
                    <SelectItem key={key}>{t(`modal.contact.methods.${key}`)}</SelectItem>
                  ))}
                </Select>
                <Input
                  label=" "
                  placeholder={t('modal.contact.valuePlaceholder')}
                  value={contactValue}
                  onValueChange={setContactValue}
                  className="w-2/3"
                />
              </div>

              {/* Screenshot preview */}
              {hasScreenshot && screenshotRef.current && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-foreground/60">{t('modal.screenshot.label')}</span>
                  <div className="relative inline-block w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshotRef.current}
                      alt="screenshot"
                      className="max-h-40 rounded border object-contain"
                    />
                    <button
                      onClick={removeScreenshot}
                      className="absolute -top-2 -right-2 rounded-full bg-foreground/80 p-0.5 text-background transition-colors hover:bg-foreground"
                      title={t('modal.screenshot.remove')}>
                      <X className="size-3" />
                    </button>
                  </div>
                  <span className="text-xs text-foreground/40">{t('modal.screenshot.captured')}</span>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={handleClose}>
              {t('modal.cancel')}
            </Button>
            <Button
              variant="solid"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              isDisabled={!category || !title.trim() || !content.trim()}>
              {isSubmitting ? t('modal.submitting') : t('modal.submit')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
