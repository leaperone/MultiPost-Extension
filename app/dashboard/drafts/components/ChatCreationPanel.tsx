'use client';

import {
  addToast,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Switch,
  Textarea,
} from '@heroui/react';
import { Message, useChat } from 'ai/react';
import { Check, CheckCircle, Clipboard, CornerDownLeft, Plus, RefreshCw, Settings } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatHistoryStore } from '@/store/chat.history.store';
import { useDraftStore } from '@/store/draft.store';
import { useTranslation } from '@/i18n/client';

interface ChatCreationPanelProps {
  draftId: string;
  draftTitle: string;
  draftContent: string;
  onApply: (data: { title?: string; content?: string }) => void;
}

export function ChatCreationPanel({ draftId, draftTitle, draftContent, onApply }: ChatCreationPanelProps) {
  const { t } = useTranslation('draft');
  const initialMessages: Message[] = [
    {
      id: '0',
      role: 'assistant',
      content: t('aiCreation.initialMessage'),
    },
  ];
  const { isAutoApplyChanges, setIsAutoApplyChanges } = useDraftStore();
  const { getChatHistory, setChatHistory, getSuggestions, setSuggestions } = useChatHistoryStore();

  const [suggestions, setSuggestionsState] = useState<
    Array<{
      messageId: string;
      title?: string;
      content?: string;
      status: 'pending' | 'applied';
    }>
  >([]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append, stop, setInput } = useChat({
    api: '/api/draft/ai/creation',
    initialMessages: getChatHistory(draftId).length > 0 ? getChatHistory(draftId) : initialMessages,
    body: {
      draftTitle,
      draftContent,
    },
    onFinish: (message) => {
      const content = message.content;
      let title: string | undefined;
      let newContent: string | undefined;

      const titleRegex = /# Updated Title\n`([^`]+)`/;
      const titleMatch = content.match(titleRegex);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }

      const contentRegex = /# Updated Content\n```(?:markdown)?\n([\s\S]+?)\n```/;
      const contentMatch = content.match(contentRegex);
      if (contentMatch) {
        newContent = contentMatch[1].trim();
      }

      if (title || newContent) {
        const autoApply = useDraftStore.getState().isAutoApplyChanges;

        if (autoApply) {
          onApply({ title, content: newContent });
          addToast({ title: t('aiCreation.toast.autoApplied'), color: 'success' });
        }

        setSuggestionsState((prev) => {
          const newSuggestions = prev.some((s) => s.messageId === message.id)
            ? prev
            : [
                ...prev,
                {
                  messageId: message.id,
                  title,
                  content: newContent,
                  status: autoApply ? ('applied' as const) : ('pending' as const),
                },
              ];

          // 同步到store
          setSuggestions(draftId, newSuggestions);
          return newSuggestions;
        });
      }
    },
  });

  // 初始化时从store恢复suggestions
  useEffect(() => {
    if (draftId) {
      const storedSuggestions = getSuggestions(draftId);
      setSuggestionsState(storedSuggestions);
    }
  }, [draftId, getSuggestions]);

  useEffect(() => {
    if (draftId) {
      setChatHistory(draftId, messages);
    }
  }, [messages, draftId, setChatHistory]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const handleScroll = () => {
      const tolerance = 5;
      isAtBottomRef.current = element.scrollHeight - element.scrollTop <= element.clientHeight + tolerance;
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => element.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const [editingContent, setEditingContent] = useState<Record<string, string>>({});

  useEffect(() => {
    const newEntries: Record<string, string> = {};
    messages.forEach((m) => {
      if (m.role === 'user' && editingContent[m.id] === undefined) {
        newEntries[m.id] = m.content;
      }
    });
    if (Object.keys(newEntries).length > 0) {
      setEditingContent((prev) => ({ ...prev, ...newEntries }));
    }
  }, [messages, editingContent]);

  const handleContentChange = (messageId: string, newContent: string) => {
    setEditingContent((prev) => ({
      ...prev,
      [messageId]: newContent,
    }));
  };

  const handleResubmit = (messageIndex: number) => {
    if (isLoading) return;

    const messageToResubmit = messages[messageIndex];
    if (!messageToResubmit) return;

    const newContent = editingContent[messageToResubmit.id];
    if (!newContent || !newContent.trim()) {
      addToast({ title: t('aiCreation.toast.contentRequired'), color: 'danger' });
      return;
    }

    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);

    append({
      role: 'user',
      content: newContent,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing) {
      e.preventDefault();
      if (input.trim()) {
        formRef.current?.requestSubmit();
      }
    }
  };

  const handleApplyChanges = (messageId: string) => {
    const suggestion = suggestions.find((s) => s.messageId === messageId);
    if (!suggestion) return;
    onApply({ title: suggestion.title, content: suggestion.content });

    const isFirstApply = suggestion.status === 'pending';
    if (isFirstApply) {
      if (suggestion.title) addToast({ title: t('aiCreation.toast.titleUpdated'), color: 'success' });
      if (suggestion.content) addToast({ title: t('aiCreation.toast.contentUpdated'), color: 'success' });
    } else {
      addToast({ title: t('aiCreation.toast.reapplied'), color: 'success' });
    }

    setSuggestionsState((prev) => {
      const newSuggestions = prev.map((s) => (s.messageId === messageId ? { ...s, status: 'applied' as const } : s));
      // 同步到store
      setSuggestions(draftId, newSuggestions);
      return newSuggestions;
    });
  };

  const handleCopy = (message: Message) => {
    const textToCopy = (message.parts ?? [])
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n');

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedStates((prev) => ({ ...prev, [message.id]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [message.id]: false }));
      }, 2000);
      addToast({
        title: t('aiCreation.toast.copied'),
        color: 'success',
      });
    }
  };

  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const handleNewChat = () => {
    setMessages(initialMessages);
    setSuggestionsState([]);
    setSuggestions(draftId, []);
    setInput('');
  };

  if (!draftId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <p className="text-default-500">{t('aiCreation.placeholder')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button
          size="sm"
          variant="flat"
          startContent={<Plus className="size-4" />}
          onPress={handleNewChat}>
          {t('aiCreation.newChat')}
        </Button>
        <Dropdown>
          <DropdownTrigger>
            <Button
              size="sm"
              variant="light"
              isIconOnly>
              <Settings className="size-4" />
            </Button>
          </DropdownTrigger>
          <DropdownMenu>
            <DropdownItem key="auto-apply">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="auto-apply-switch"
                  className="text-sm">
                  {t('aiCreation.autoApply')}
                </label>
                <Switch
                  id="auto-apply-switch"
                  isSelected={isAutoApplyChanges}
                  onValueChange={setIsAutoApplyChanges}
                />
              </div>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m, index) => (
          <div
            key={m.id}
            className="flex w-full flex-col gap-3">
            {m.role === 'user' ? (
              <div className="rounded-lg border bg-default-100 p-3">
                <Textarea
                  value={editingContent[m.id] || ''}
                  onChange={(e) => handleContentChange(m.id, e.target.value)}
                  minRows={1}
                  className="w-full resize-none border-none bg-transparent p-0 focus:outline-none focus:ring-0"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => handleResubmit(index)}
                    isDisabled={isLoading}>
                    <RefreshCw className="size-4" />
                    {t('aiCreation.regenerate')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-sm">
                  <ReactMarkdown>
                    {m.content
                      .replace(/# Updated Title\n`[^`]+`/g, '')
                      .replace(/# Updated Content\n```(?:markdown)?\n[\s\S]+?\n```/g, '')}
                  </ReactMarkdown>
                </div>
                {(() => {
                  const suggestion = suggestions.find((s) => s.messageId === m.id);
                  if (!suggestion) return null;
                  return (
                    <div className="mt-2 rounded-lg border border-primary-200 bg-primary-50 p-3 dark:bg-primary-900/20">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                          {t('aiCreation.suggestion.title')}
                        </h4>
                        {suggestion.status === 'applied' && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="size-3" />
                            <span>{t('aiCreation.suggestion.applied')}</span>
                          </div>
                        )}
                      </div>

                      {suggestion.title && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-default-500">{t('aiCreation.suggestion.newTitle')}</p>
                          <div className="mt-1 rounded-md bg-white p-2 text-sm dark:bg-default-100">
                            {suggestion.title}
                          </div>
                        </div>
                      )}
                      {suggestion.content && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-default-500">
                            {t('aiCreation.suggestion.newContent')}
                          </p>
                          <div className="mt-1 whitespace-pre-wrap rounded-md bg-white p-2 text-sm dark:bg-default-100">
                            {suggestion.content}
                          </div>
                        </div>
                      )}
                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          size="sm"
                          color="primary"
                          onPress={() => handleApplyChanges(m.id)}>
                          {suggestion.status === 'pending'
                            ? t('aiCreation.suggestion.apply')
                            : t('aiCreation.suggestion.reapply')}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => handleCopy(m)}
                    startContent={copiedStates[m.id] ? <Check className="size-4" /> : <Clipboard className="size-4" />}>
                    {copiedStates[m.id] ? t('aiCreation.copied') : t('aiCreation.copy')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-default-100 p-2">
        <form
          ref={formRef}
          onSubmit={handleSubmit}>
          <div className="relative">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t('aiCreation.inputPlaceholder')}
              minRows={1}
              maxRows={10}
              className="pr-20"
              disabled={isLoading}
            />
            <div className="absolute bottom-2 right-2">
              {isLoading ? (
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  onPress={stop}>
                  {t('aiCreation.stop')}
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  isIconOnly
                  disabled={!input.trim()}>
                  <CornerDownLeft className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
