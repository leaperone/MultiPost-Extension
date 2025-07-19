import { createDeepSeek } from '@ai-sdk/deepseek';
import { CoreMessage, streamText } from 'ai';

const openai = createDeepSeek({
  baseURL: process.env.DEEPSEEK_BASE_URL || '',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

// 允许流式响应最多持续30秒
export const maxDuration = 60;

const getSystemPrompt = (title: string, content: string) => {
  let background = '';
  if (title) {
    background += `\n- Current Title: ${title}`;
  }
  if (content) {
    background += `\n- Current Content: ${content}`;
  }

  return `
# Role: 文案润色专家

## Profile
- author: Harry
- version: 2.0 (Function Calling)
- language: 中文
- description: 专注于文字润色与优化，并通过 Markdown 格式输出最终结果。

## Skills
1. 优化文本结构，使语言更加流畅自然。  
2. 精炼语言，减少冗余，去除多余的语气词与口语化表达。  
3. 修改错别字与语法错误，确保表达准确无误。  
4. **通过特定格式的 Markdown 输出润色后的内容。**

## Background(可选项):
${background ? `这是当前的草稿内容，请基于此进行润色：${background}` : '适合需要改善文章流畅度与表达效果的用户，包括社交平台发言、商务文案、个人表达等多种场景。'}

## Workflow:
1. 分析用户的请求和当前的草稿内容。
2. 在构思出润色方案后，可以先用文字回复，简要说明你的修改思路。
3. 在回复的最后，使用以下 Markdown 格式提供最终的润色结果：
   - 如果润色了标题，使用一级标题 \`# Updated Title\`，然后在下一行用 **单行代码块** 提供新标题。
   - 如果润色了内容，使用一级标题 \`# Updated Content\`，然后在下一行用 **多行代码块** 提供新内容。
   - 你可以同时提供标题和内容的更新。

## Example Output:
这是一个示例。

...你的修改思路说明...

# Updated Title
\`这是润色后的新标题\`

# Updated Content
\`\`\`markdown
这是润色后的新内容。
它支持多行。
\`\`\`
`;
};

export async function POST(req: Request) {
  const bodyText = await req.text();
  if (!bodyText) {
    return new Response(JSON.stringify({ message: 'Request body cannot be empty.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch (e) {
    return new Response(JSON.stringify({ message: 'Invalid JSON in request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    messages,
    draftTitle,
    draftContent,
  }: { messages: CoreMessage[]; draftTitle?: string; draftContent?: string } = data;

  const systemPrompt = getSystemPrompt(draftTitle || '', draftContent || '');

  const result = await streamText({
    model: openai(process.env.DEEPSEEK_MODEL || 'deepseek-chat', {}),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
