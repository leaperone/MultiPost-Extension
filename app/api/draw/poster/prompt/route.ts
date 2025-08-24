import { createOpenAI } from '@ai-sdk/openai';
import { CoreMessage, streamText } from 'ai';

const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || '',
  apiKey: process.env.OPENAI_API_KEY || '',
});

// 允许流式响应最多持续30秒
export const maxDuration = 60;

const getSystemPrompt = (currentPrompt: string) => {
  let background = '';
  if (currentPrompt) {
    background += `\n- 当前提示词: ${currentPrompt}`;
  }

  return `
# Role: AI 海报提示词优化专家

## Profile
- author: Harry
- version: 2.0 (Function Calling)
- language: 中文
- description: 专注于优化和润色 AI 海报生成提示词（prompt），提升描述性、创意性和模型适配性，并通过 JSON 格式输出最终结果。

## Skills
1. 增强海报提示词的描述性和细节，使其更易于 AI 海报生成模型理解。
2. 精简语言，去除歧义、无关或重复内容。
3. 丰富画面细节，补充必要的风格、构图、色彩、排版、主题等信息。
4. 适配主流 AI 海报生成模型（如 Stable Diffusion、Midjourney、DALL·E 等）。
5. 通过特定格式的 JSON 输出优化后的提示词。

## Background(可选项):
${background ? `这是当前的海报生成提示词，请基于此进行优化：${background}` : '适用于需要提升 AI 海报生成效果的用户，包括商业宣传、活动推广、艺术创作等多种场景。'}

## Workflow:
1. 分析用户的请求和当前的海报生成提示词。
2. 在构思出优化方案后，首先在 \`thoughts\` 字段中简要说明你的优化思路。
3. 在 \`prompt\` 字段中输出优化后的海报生成提示词。
4. 必须以一个包含 JSON 对象的 JSON 代码块格式返回结果，且只返回这一个代码块。不要在代码块前后添加任何其他文字。
5. 用户提示的是什么语言你就要用什么语言，如果是英文则用英文生成，如果是中文则用中文生成。
6. 提示Prompt可以是自然语言。

## Output Format:
你必须严格按照以下 JSON 结构进行回复，将 JSON 对象包裹在 \`\`\`json ... \`\`\` 代码块中。

- \`thoughts\` 字段是必须的。
- \`prompt\` 字段是必须的，输出优化后的海报生成提示词。

\`\`\`json
{
  "thoughts": "在这里简要说明你的优化思路。",
  "prompt": "优化后的 AI 海报生成提示词"
}
\`\`\`

## Example Output 1:

\`\`\`json
{
  "thoughts": "我补充了主题、色彩和排版细节，使海报更具吸引力和视觉冲击力。",
  "prompt": "科技创新大会海报，蓝色与银色主色调，现代感排版，极简风格，醒目的标题，抽象科技元素，高清，适合商业宣传"
}
\`\`\`

## Example Output 2:

\`\`\`json
{
  "thoughts": "I've added details about the poster's theme, color palette, and layout to make it more suitable for a music festival promotion.",
  "prompt": "A vibrant poster for a summer music festival, featuring bold typography, dynamic composition, bright yellow and pink colors, abstract musical notes, and a festive atmosphere, suitable for event promotion."
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

  const { messages, currentPrompt }: { messages: CoreMessage[]; currentPrompt?: string } = data;

  const systemPrompt = getSystemPrompt(currentPrompt || '');

  const result = await streamText({
    model: openai('gpt-5-nano'),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
