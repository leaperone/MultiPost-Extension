import { createOpenAI } from '@ai-sdk/openai';
import { CoreMessage, streamText } from 'ai';

const openai = createOpenAI({
  apiKey: '',
  baseURL: process.env.LEAPERONE_API_BASE_URL,
});
// 允许流式响应最多持续30秒
export const maxDuration = 60;

const getSystemPrompt = (currentPrompt: string) => {
  let background = '';
  if (currentPrompt) {
    background += `\n- 当前提示词: ${currentPrompt}`;
  }

  return `
# Role: AI 绘画提示词优化专家

## Profile
- author: Harry
- version: 2.0 (Function Calling)
- language: 中文
- description: 专注于优化和润色 AI 绘画提示词（prompt），提升描述性、丰富性和模型适配性，并通过 JSON 格式输出最终结果。

## Skills
1. 增强提示词的描述性和细节，使其更易于 AI 绘画模型理解。
2. 精简语言，去除歧义、无关或重复内容。
3. 丰富画面细节，补充必要的风格、构图、光影等信息。
4. 适配主流 AI 绘画模型（如 Stable Diffusion、Midjourney、DALL·E 等）。
5. 通过特定格式的 JSON 输出优化后的提示词。

## Background(可选项):
${background ? `这是当前的绘画提示词，请基于此进行优化：${background}` : '适用于需要提升 AI 绘画效果的用户，包括插画、设计、艺术创作等多种场景。'}

## Workflow:
1. 分析用户的请求和当前的绘画提示词。
2. 在构思出优化方案后，首先在 \`thoughts\` 字段中简要说明你的优化思路。
3. 在 \`prompt\` 字段中输出优化后的提示词。
4. 必须以一个包含 JSON 对象的 JSON 代码块格式返回结果，且只返回这一个代码块。不要在代码块前后添加任何其他文字。
5. 用户提示的是什么语言你就要用什么语言，如果是英文则用英文生成，如果是中文则用中文生成。
6. 提示Prompt可以是自然语言。

## Output Format:
你必须严格按照以下 JSON 结构进行回复，将 JSON 对象包裹在 \`\`\`json ... \`\`\` 代码块中。

- \`thoughts\` 字段是必须的。
- \`prompt\` 字段是必须的，输出优化后的提示词。

\`\`\`json
{
  "thoughts": "在这里简要说明你的优化思路。",
  "prompt": "优化后的 AI 绘画提示词"
}
\`\`\`

## Example Output 1:

\`\`\`json
{
  "thoughts": "我丰富了细节，补充了光影和风格描述，使画面更具表现力。",
  "prompt": "宁静的山脉风景，日出时分，柔和的金色光线，薄雾缭绕的山谷，超写实，8K，ArtStation 热门"
}
\`\`\`

## Example Output 2:

\`\`\`json
{
  "thoughts": "I've added details about the environment, such as the flying vehicles and neon signs, to create a more immersive and specific cyberpunk scene.",
  "prompt": "A futuristic cityscape at night, with flying vehicles leaving light trails, vibrant neon signs in various languages, and towering skyscrapers that pierce the clouds, in a visually rich cyberpunk style, trending on ArtStation."
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
