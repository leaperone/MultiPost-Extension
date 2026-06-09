import {
  addToast,
  Button,
  Chip,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from '@heroui/react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  MessageSquareText,
  Send,
  Star,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  adminAddInternalNote,
  adminDeleteConversation,
  adminGetConversation,
  adminReplyConversation,
  adminUpdateStatus,
} from '../../../actions/support/admin';
import type { SupportStatus } from '../../../actions/support/types';

const STATUS_OPTIONS: { key: SupportStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  ai: 'AI',
  agent: 'Agent',
};

const REPLY_TEMPLATES = [
  { label: 'Acknowledged', text: 'Hi, we have received your feedback and are working on it. Please be patient.' },
  {
    label: 'Need more info',
    text: 'Hi, to better help you, could you provide more details?\n1. Which page did you encounter the issue on?\n2. The exact steps you took\n3. Screenshots (if any)',
  },
  { label: 'Fixed', text: 'Hi, the issue you reported has been fixed. Please refresh the page and try again. Let us know if you still have problems.' },
  { label: 'Not supported', text: 'Hi, thank you for your suggestion. This feature is not currently supported, but we have noted it for future evaluation.' },
];

interface Message {
  id: string;
  role: string;
  senderUserId: string | null;
  content: string;
  isInternal: boolean;
  attachments: { type: string; url?: string }[] | null;
  createdAt: string | Date;
}

interface ConversationDetail {
  id: string;
  userId: string;
  status: string;
  category: string;
  subject: string | null;
  priority: string;
  satisfactionRating: number | null;
  satisfactionComment: string | null;
  metadata: Record<string, unknown> | null;
  assignedTo: string | null;
  hasUnreadReply: boolean;
  pageUrl: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  resolvedAt: string | Date | null;
  closedAt: string | Date | null;
  firstResponseAt: string | Date | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export const Route = createFileRoute('/admin/support/$id')({
  component: AdminSupportDetailPage,
});

function TemplateReplies({ onSelect }: { onSelect: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div
      className="relative"
      ref={ref}>
      <Button
        size="sm"
        variant="flat"
        startContent={<MessageSquareText className="size-3.5" />}
        onPress={() => setOpen(!open)}>
        Templates
      </Button>
      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-64 rounded-lg border bg-background shadow-lg">
          <div className="max-h-60 overflow-y-auto py-1">
            {REPLY_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => {
                  onSelect(template.text);
                  setOpen(false);
                }}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-default-50">
                <span className="text-xs font-medium">{template.label}</span>
                <span className="line-clamp-2 text-[11px] text-default-400">{template.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminSupportDetailPage() {
  const { id: conversationId } = Route.useParams();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [sending, setSending] = useState(false);
  const [showInternal, setShowInternal] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const result = await adminGetConversation({ data: { conversationId } });
    if (result.success && result.data) {
      setConversation(result.data.conversation as ConversationDetail);
      setMessages(result.data.messages as Message[]);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    const result = await adminReplyConversation({
      data: { conversationId, content: reply.trim() },
    });
    if (result.success) {
      setReply('');
      addToast({ title: 'Reply sent', hideIcon: true });
      await load();
    } else {
      addToast({ title: result.error || 'Failed to reply', hideIcon: true });
    }
    setSending(false);
  };

  const handleAddNote = async () => {
    if (!internalNote.trim()) return;
    setSending(true);
    const result = await adminAddInternalNote({
      data: { conversationId, content: internalNote.trim() },
    });
    if (result.success) {
      setInternalNote('');
      addToast({ title: 'Note added', hideIcon: true });
      await load();
    } else {
      addToast({ title: result.error || 'Failed to add note', hideIcon: true });
    }
    setSending(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    const result = await adminUpdateStatus({
      data: { conversationId, status: newStatus as SupportStatus },
    });
    if (result.success) {
      addToast({ title: 'Status updated', hideIcon: true });
      await load();
    } else {
      addToast({ title: result.error || 'Failed to update', hideIcon: true });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!conversation) {
    return <div className="p-6 text-center text-default-500">Ticket not found</div>;
  }

  const visibleMessages = showInternal ? messages : messages.filter((message) => !message.isInternal);

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Link
            to="/admin/support"
            className="rounded p-1 hover:bg-default-100">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{conversation.subject}</h3>
            <span className="text-xs text-default-500">
              {conversation.user?.name || conversation.user?.email} &middot; {conversation.category}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowInternal(!showInternal)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-default-500 hover:bg-default-100">
            {showInternal ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {showInternal ? 'Hide' : 'Show'} notes
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {visibleMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[75%]">
                  <div className={`mb-0.5 text-[10px] text-default-400 ${isUser ? '' : 'text-right'}`}>
                    {ROLE_LABELS[msg.role] || msg.role}
                    {msg.isInternal && (
                      <Chip
                        size="sm"
                        variant="flat"
                        color="warning"
                        className="ml-1">
                        Internal
                      </Chip>
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      isUser
                        ? 'border bg-default-50'
                        : msg.isInternal
                          ? 'border border-dashed border-warning/50 bg-warning/5'
                          : 'bg-foreground text-background'
                    }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.attachments?.map((att, index) =>
                      att.url ? (
                        <img
                          key={index}
                          src={att.url}
                          alt="Attachment"
                          className="mt-2 max-h-48 rounded border object-contain"
                        />
                      ) : null,
                    )}
                  </div>
                  <div className={`mt-0.5 text-[10px] text-default-300 ${isUser ? '' : 'text-right'}`}>
                    {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
          {visibleMessages.length > 0 && visibleMessages[visibleMessages.length - 1].role !== 'user' && (
            <div className="text-right text-[10px] text-default-300">
              {conversation.hasUnreadReply ? 'Unread' : 'Read'}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="space-y-2 border-t p-3">
          <Textarea
            size="sm"
            placeholder="Reply to user..."
            value={reply}
            onValueChange={setReply}
            minRows={2}
            maxRows={4}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              color="primary"
              onPress={handleReply}
              isLoading={sending}
              isDisabled={!reply.trim()}
              startContent={!sending ? <Send className="size-3.5" /> : undefined}>
              Send Reply
            </Button>
            <TemplateReplies onSelect={(text) => setReply((prev) => (prev ? `${prev}\n${text}` : text))} />
          </div>
          <div className="flex items-center gap-2">
            <Textarea
              size="sm"
              placeholder="Internal note (hidden from user)..."
              value={internalNote}
              onValueChange={setInternalNote}
              minRows={1}
              maxRows={2}
              className="flex-1"
            />
            <Button
              size="sm"
              variant="flat"
              onPress={handleAddNote}
              isDisabled={!internalNote.trim() || sending}>
              Add Note
            </Button>
          </div>
        </div>
      </div>

      <div className="w-64 space-y-4 overflow-y-auto border-l p-4">
        <div>
          <span className="text-xs text-default-500">Status</span>
          <Select
            size="sm"
            selectedKeys={[conversation.status]}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0];
              if (val) void handleStatusChange(String(val));
            }}
            className="mt-1">
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.key}>{status.label}</SelectItem>
            ))}
          </Select>
        </div>

        <div>
          <span className="text-xs text-default-500">Priority</span>
          <p className="mt-1 text-sm capitalize">{conversation.priority}</p>
        </div>

        <div>
          <span className="text-xs text-default-500">User</span>
          <div className="mt-1 space-y-1 text-xs">
            <p>{conversation.user?.name || 'No name'}</p>
            <p className="text-default-400">{conversation.user?.email}</p>
          </div>
        </div>

        <div>
          <span className="text-xs text-default-500">Source Page</span>
          <p className="mt-1 break-all text-xs">{conversation.pageUrl || 'Unknown'}</p>
        </div>

        <div>
          <span className="text-xs text-default-500">Created</span>
          <p className="mt-1 text-xs">{new Date(conversation.createdAt).toLocaleString()}</p>
        </div>

        {conversation.firstResponseAt && (
          <div>
            <span className="text-xs text-default-500">First Response</span>
            <p className="mt-1 text-xs">{new Date(conversation.firstResponseAt).toLocaleString()}</p>
          </div>
        )}

        {conversation.satisfactionRating && (
          <div>
            <span className="text-xs text-default-500">Satisfaction</span>
            <div className="mt-1 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`size-3.5 ${
                    i <= (conversation.satisfactionRating ?? 0)
                      ? 'fill-foreground text-foreground'
                      : 'text-default-200'
                  }`}
                />
              ))}
            </div>
            {conversation.satisfactionComment && (
              <p className="mt-1 text-xs text-default-500">{conversation.satisfactionComment}</p>
            )}
          </div>
        )}

        {conversation.metadata && (
          <div>
            <span className="text-xs text-default-500">Debug Info</span>
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-default-400 hover:text-primary">
                View metadata
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded border p-2 text-[10px]">
                {JSON.stringify(conversation.metadata, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div className="border-t pt-4">
          <Button
            size="sm"
            color="danger"
            variant="flat"
            fullWidth
            startContent={<Trash2 className="size-3.5" />}
            onPress={async () => {
              if (!confirm('Delete this conversation? All messages and attachments will be permanently deleted.')) {
                return;
              }
              const result = await adminDeleteConversation({ data: { conversationId } });
              if (result.success) {
                addToast({ title: 'Conversation deleted', hideIcon: true });
                void navigate({ to: '/admin/support' });
              } else {
                addToast({ title: result.error || 'Delete failed', hideIcon: true });
              }
            }}>
            Delete conversation
          </Button>
        </div>
      </div>
    </div>
  );
}
