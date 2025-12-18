---
name: ai-feature
description: AI integration using Vercel AI SDK for LLM features. Use when implementing AI chat, streaming responses, text generation, or integrating with DeepSeek/OpenAI/Claude models.
---

# AI Integration

Uses Vercel AI SDK for AI/LLM features.

## Vercel AI SDK Components

- **AI SDK UI**: Streaming chat interfaces
- **AI SDK Core**: Direct language model interactions
- **AI SDK RSC**: React Server Components integration
- **AI SDK Stream Helpers**: Streaming response utilities

## Configuration

Environment variables required:

```bash
DEEPSEEK_API_KEY=<your_key>
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

## Streaming Chat (Client)

```tsx
'use client';

import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.role}: {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

## Text Generation (Server)

```typescript
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const deepseek = createOpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL,
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const { text } = await generateText({
  model: deepseek(process.env.DEEPSEEK_MODEL),
  prompt: 'Hello, how are you?',
});
```

## Error Handling

```typescript
try {
  const response = await generateText({ ... });
  return response;
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    return { error: '请求过于频繁，请稍后再试' };
  }
  if (error.code === 'insufficient_quota') {
    return { error: 'AI 服务配额已用尽' };
  }
  return { error: 'AI 服务暂时不可用' };
}
```

## Implementation Guidelines

- Implement proper error handling for AI responses
- Provide fallback mechanisms when AI models are unavailable
- Handle rate limiting and quota exceeded scenarios gracefully
- **Sanitize user inputs** before sending to AI models
- Store API keys in environment variables (never in code)
- Implement model switching capabilities (DeepSeek, OpenAI, Claude)
