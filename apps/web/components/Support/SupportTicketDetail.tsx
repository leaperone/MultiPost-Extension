'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { addMessage, getConversation } from '@/actions/support';
import { useTranslation } from '@/i18n/client';
import { compressImageToBlob, uploadSupportImage, getRoleStyles } from '@/lib/support-utils';
import SupportSatisfaction from './SupportSatisfaction';
import { Spinner, Textarea, addToast } from '@heroui/react';
import { ArrowLeft, ImagePlus, Send, X } from 'lucide-react';

interface Message {
  id: string;
  role: string;
  content: string;
  attachments: { type: string; key: string; url?: string }[] | null;
  createdAt: Date;
}

interface Conversation {
  id: string;
  subject: string;
  status: string;
  satisfactionRating: number | null;
}

interface SupportTicketDetailProps {
  conversationId: string;
  onBack: () => void;
}

function formatMessageTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;

  return `${d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} ${time}`;
}

export default function SupportTicketDetail({ conversationId, onBack }: SupportTicketDetailProps) {
  const { t } = useTranslation('support');
  const roleStyles = getRoleStyles(t);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadConversation = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getConversation(conversationId);
      if (result.success && result.data) {
        setConversation(result.data.conversation as Conversation);
        setMessages(result.data.messages as Message[]);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!loading) {
      scrollToBottom();
    }
  }, [loading, messages.length, scrollToBottom]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast({ title: t('detail.imageOnly'), hideIcon: true });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const handleSend = async () => {
    const content = replyContent.trim();
    if (!content && !imageFile) return;
    if (!content) {
      addToast({ title: t('detail.enterMessage'), hideIcon: true });
      return;
    }

    setSending(true);
    try {
      let attachmentKeys: string[] | undefined;

      if (imageFile) {
        const blob = await compressImageToBlob(imageFile);
        const key = await uploadSupportImage(blob, conversationId);
        attachmentKeys = [key];
      }

      const result = await addMessage(conversationId, content, attachmentKeys);
      if (result.success) {
        setReplyContent('');
        clearImage();
        await loadConversation();
      } else {
        addToast({ title: result.error || t('detail.sendFailed'), hideIcon: true });
      }
    } catch {
      addToast({ title: t('detail.sendFailedRetry'), hideIcon: true });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">{t('detail.notFound')}</p>
      </div>
    );
  }

  const isClosed = conversation.status === 'closed';
  const isResolved = conversation.status === 'resolved';
  const showSatisfaction = (isClosed || isResolved) && conversation.satisfactionRating === null;
  const showInput = !isClosed;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <button
          type="button"
          className="p-1 rounded-md transition-colors hover:bg-default-100"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
        </button>
        <h3 className="text-sm font-medium truncate text-foreground">
          {conversation.subject}
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => {
          const roleStyle = roleStyles[msg.role as keyof typeof roleStyles] || roleStyles.agent;
          const isUser = msg.role === 'user';
          const attachments = msg.attachments as { type: string; key: string; url?: string }[] | null;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${roleStyle.align}`}
            >
              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  isUser
                    ? 'bg-foreground text-background'
                    : 'bg-default-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>

                {/* Image attachments */}
                {attachments && attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attachments.map((att, idx) => (
                      att.url ? (
                        <img
                          key={idx}
                          src={att.url}
                          alt={t('detail.attachment')}
                          className="max-h-48 rounded border object-cover"
                        />
                      ) : null
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {formatMessageTime(msg.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Satisfaction rating */}
      {showSatisfaction && (
        <SupportSatisfaction
          conversationId={conversationId}
          onRated={loadConversation}
        />
      )}

      {/* Reply input */}
      {showInput && (
        <div className="border-t px-4 py-3">
          {/* Image preview */}
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <img
                src={imagePreview}
                alt={t('detail.preview')}
                className="max-h-24 rounded border object-cover"
              />
              <button
                type="button"
                className="absolute -top-1.5 -right-1.5 rounded-full bg-foreground text-background p-0.5"
                onClick={clearImage}
              >
                <X className="size-3" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              type="button"
              className="p-2 rounded-md transition-colors hover:bg-default-100 text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="size-4" />
            </button>

            <Textarea
              placeholder={t('detail.replyPlaceholder')}
              value={replyContent}
              onValueChange={setReplyContent}
              onKeyDown={handleKeyDown}
              minRows={1}
              maxRows={4}
              className="flex-1"
              isDisabled={sending}
            />

            <button
              type="button"
              className="p-2 rounded-md transition-colors hover:bg-default-100 text-foreground disabled:opacity-40"
              onClick={handleSend}
              disabled={sending || (!replyContent.trim() && !imageFile)}
            >
              {sending ? (
                <Spinner size="sm" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {t('detail.replyNotice')}
          </p>
        </div>
      )}
    </div>
  );
}
