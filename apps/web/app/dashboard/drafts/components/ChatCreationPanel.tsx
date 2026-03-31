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
import { Check, CheckCircle, Clipboard, CornerDownLeft, Plus, RefreshCw, Settings, X, Clock } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatHistoryStore } from '@/store/chat.history.store';
import { useDraftStore } from '@/store/draft.store';
import { useTranslation } from '@/i18n/client';
import { parseTitleContentResponse } from '@/lib/ai-response-parser';

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
      let thoughts: string | undefined;

      // Use ai-response-parser to extract structured data from AI response
      const result = parseTitleContentResponse<{ thoughts?: string; title?: string; content?: string }>(content);

      if (result.success && result.data) {
        thoughts = result.data.thoughts;
        title = result.data.title;
        newContent = result.data.content;

        if (thoughts) {
          setMessages((prevMessages) =>
            prevMessages.map((m) => (m.id === message.id ? { ...m, content: thoughts! } : m)),
          );
        }
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
          // setSuggestions(draftId, newSuggestions);
          return newSuggestions;
        });

        setSuggestions(
          draftId,
          suggestions.some((s) => s.messageId === message.id)
            ? suggestions
            : [
                ...suggestions,
                {
                  messageId: message.id,
                  title,
                  content: newContent,
                  status: autoApply ? 'applied' : 'pending',
                },
              ],
        );
      }

      setChatHistory(draftId, messages);

      // Auto-focus input after generation completes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    },
  });

  // Initialize suggestions from store
  useEffect(() => {
    if (draftId) {
      const storedSuggestions = getSuggestions(draftId);
      setSuggestionsState(storedSuggestions);
    }
  }, [draftId, getSuggestions]);

  // Auto-focus input when component mounts with a draftId
  useEffect(() => {
    if (draftId) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [draftId]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isAtBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queueInputRef = useRef<HTMLTextAreaElement>(null);

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
    setEditingContent((prev) => {
      const newEntries: Record<string, string> = {};
      let hasChanges = false;
      messages.forEach((m) => {
        if (m.role === 'user' && prev[m.id] === undefined) {
          newEntries[m.id] = m.content;
          hasChanges = true;
        }
      });

      if (hasChanges) {
        return { ...prev, ...newEntries };
      }

      return prev;
    });
  }, [messages]);

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
      if (input.trim() || todoQueue.length > 0) {
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

      return newSuggestions;
    });
    setSuggestions(
      draftId,
      suggestions.map((s) => (s.messageId === messageId ? { ...s, status: 'applied' as const } : s)),
    );
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
  const [todoQueue, setTodoQueue] = useState<
    Array<{
      id: string;
      content: string;
      timestamp: number;
    }>
  >([]);
  const [queueInput, setQueueInput] = useState('');

  const handleNewChat = () => {
    setMessages(initialMessages);
    setSuggestionsState([]);
    setSuggestions(draftId, []);
    setInput('');
    setTodoQueue([]);
    setQueueInput('');
    // Auto-focus input after new chat
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Todo queue management functions
  const addToTodoQueue = (content: string) => {
    if (!content.trim()) return;
    const newItem = {
      id: Date.now().toString(),
      content: content.trim(),
      timestamp: Date.now(),
    };
    setTodoQueue((prev) => [...prev, newItem]);
    setQueueInput('');
  };

  const removeFromTodoQueue = (id: string) => {
    setTodoQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const processNextTodoItem = useCallback(() => {
    if (todoQueue.length === 0 || isLoading) return;

    const nextItem = todoQueue[0];
    setTodoQueue((prev) => prev.slice(1)); // Remove the item before sending
    append({
      role: 'user',
      content: nextItem.content,
    });
  }, [todoQueue, isLoading, append]);

  // Only auto-process next item when user manually submits, not after stop
  const [shouldAutoProcess, setShouldAutoProcess] = useState(true);

  // Automatically process the next item when generation completes and queue is not empty
  useEffect(() => {
    if (!isLoading && todoQueue.length > 0 && shouldAutoProcess) {
      const timer = setTimeout(() => {
        processNextTodoItem();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, todoQueue.length, processNextTodoItem, shouldAutoProcess]);

  const handleQueueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queueInput.trim()) {
      if (isLoading) {
        addToTodoQueue(queueInput);
      } else {
        append({
          role: 'user',
          content: queueInput.trim(),
        });
        setQueueInput('');
      }
    }
  };

  const handleQueueKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing) {
      e.preventDefault();
      if (queueInput.trim()) {
        handleQueueSubmit(e);
      }
    }
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
                  className="w-full resize-none border-none bg-transparent p-0 focus:outline-hidden focus:ring-0"
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
                <div className="whitespace-pre-line break-words text-sm">
                  <ReactMarkdown
                    components={{
                      code({ className, children, ...props }) {
                        return (
                          <code
                            className={`whitespace-pre-wrap break-words ${className || ''}`}
                            {...props}>
                            {children}
                          </code>
                        );
                      },
                      pre({ className, children, ...props }) {
                        return (
                          <pre
                            className={`whitespace-pre-wrap break-words ${className || ''}`}
                            {...props}>
                            {children}
                          </pre>
                        );
                      },
                    }}>
                    {m.content}
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
                          <div className="prose prose-sm mt-1 max-w-none rounded-md bg-white p-2 text-sm dark:prose-invert dark:bg-default-100">
                            <ReactMarkdown>{suggestion.content}</ReactMarkdown>
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

      {todoQueue.length > 0 && (
        <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 p-3 dark:bg-warning-900/20">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warning-700 dark:text-warning-300">
            <Clock className="size-4" />
            {t('aiCreation.todoQueue')} ({todoQueue.length})
          </div>
          <div className="space-y-2">
            {todoQueue.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md bg-white p-2 text-sm dark:bg-default-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-default-500">#{index + 1}</span>
                  <span className="line-clamp-1">{item.content}</span>
                </div>
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={() => removeFromTodoQueue(item.id)}>
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl bg-default-100 p-2">
        {isLoading ? (
          <form onSubmit={handleQueueSubmit}>
            <div className="relative">
              <Textarea
                ref={queueInputRef}
                value={queueInput}
                onChange={(e) => setQueueInput(e.target.value)}
                onKeyDown={handleQueueKeyDown}
                placeholder={t('aiCreation.queuePlaceholder')}
                minRows={1}
                maxRows={10}
                className="pr-20"
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  onPress={() => {
                    stop();
                    setShouldAutoProcess(false); // Disable auto-processing after stop
                  }}>
                  {t('aiCreation.stop')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="flat"
                  disabled={!queueInput.trim()}>
                  {t('aiCreation.addToQueue')}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              setShouldAutoProcess(true); // Enable auto-processing when user manually submits
              if (input.trim()) {
                handleSubmit(e);
              } else if (todoQueue.length > 0) {
                processNextTodoItem();
              }
            }}>
            <div className="relative">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  todoQueue.length > 0
                    ? t('aiCreation.continueQueuePlaceholder')
                    : t('aiCreation.inputPlaceholder')
                }
                minRows={1}
                maxRows={10}
                className="pr-20"
              />
              <div className="absolute bottom-2 right-2">
                <Button
                  type="submit"
                  size="sm"
                  isIconOnly>
                  <CornerDownLeft className="size-4" />
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
