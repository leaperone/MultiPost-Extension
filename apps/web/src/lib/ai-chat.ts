import type { UIMessage } from 'ai';

/**
 * AI SDK v5+ replaced the flat `message.content` string with a `parts` array.
 * These helpers centralize text extraction/construction so UI components can
 * keep working with plain strings.
 */
export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function createTextMessage(role: UIMessage['role'], text: string, id?: string): UIMessage {
  return {
    id: id ?? crypto.randomUUID(),
    role,
    parts: [{ type: 'text', text }],
  };
}

export function withMessageText(message: UIMessage, text: string): UIMessage {
  return { ...message, parts: [{ type: 'text', text }] };
}
