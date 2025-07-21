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
2. 在构思出润色方案后，首先在 \`thoughts\` 字段中简要说明你的修改思路。
3. 如果你修改了标题，请在 \`title\` 字段中提供润色后的结果。
4. 如果你修改了内容，请在 \`content\` 字段中提供润色后的结果。
5. **必须以一个包含 JSON 对象的 Markdown 代码块格式返回结果，且只返回这一个代码块。不要在代码块前后添加任何其他文字。**

## Output Format:
你必须严格按照以下 JSON 结构进行回复，将 JSON 对象包裹在 \`\`\`json ... \`\`\` 代码块中。

- \`thoughts\` 字段是必须的。
- \`title\` 和 \`content\` 字段是可选的。仅在你对它们进行修改时才包含它们。

**重要提示**: JSON 字符串中的所有特殊字符都必须正确转义。例如，换行符必须表示为 \`\\n\`，双引号必须表示为 \`\\" \`，反斜杠必须表示为 \`\\\\ \`。

\`\`\`json
{
  "thoughts": "在这里简要说明你的修改思路。",
  "title": "润色后的新标题",
  "content": "润色后的新内容"
}
\`\`\`

## Example Output:

### 示例 1: 只修改标题
\`\`\`json
{
  "thoughts": "我只修改了标题，使其更吸引人。",
  "title": "这是润色后的新标题"
}
\`\`\`

### 示例 2: 只修改内容
\`\`\`json
{
  "thoughts": "内容部分表达不够清晰，我进行了精简。",
  "content": "这是润色后的新内容。\\n它支持多行。"
}
\`\`\`

### 示例 3: 同时修改标题和内容
\`\`\`json
{
  "thoughts": "我优化了标题和内容，使其表达更清晰。",
  "title": "这是润色后的新标题",
  "content": "这是润色后的新内容。\\n它支持多行。"
}
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
