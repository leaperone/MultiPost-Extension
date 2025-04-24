import { authKey } from '@/actions/authKey';
import { batchDeductCredit, preCheckCredit } from '@/actions/credit';
import { PRICING, UsageType } from '@/actions/credit/types';
import { NextRequest } from 'next/server';
import { errorResp, successResp, unauthResp } from '@/lib/request';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { Decimal } from '@prisma/client/runtime/library';
import { fetchJinaReader, requestSchema } from '../lib';

// 创建 OpenAI 客户端 (实际使用 Deepseek)
const openai = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_BASE_URL || '',
});

// 系统提示词
const DEFAULT_SYSTEM_PROMPT = `
You are a professional web content analysis assistant.
`;

export async function POST(req: NextRequest) {
  try {
    // 认证和预检查
    const { userId } = await authKey(req);
    if (!userId) return unauthResp();

    if (!(await preCheckCredit(userId))) {
      throw new Error('Precheck failed, please top up over 0.1 credits');
    }

    // 解析请求并获取网页内容
    const options = requestSchema.parse(await req.json());
    const { data: jinaResp } = await fetchJinaReader(options);

    // 使用 LLM 分析网页内容
    const { text, usage: llmUsage } = await generateText({
      model: openai(process.env.DEEPSEEK_MODEL || 'deepseek-chat', {}),
      system: DEFAULT_SYSTEM_PROMPT,
      prompt: `Web Content:
      \`\`\`\n\n${jinaResp.content}\n\n\`\`\`
      \n\nUser Prompt: ${
        options.prompt ||
        ` Your task is to analyze the web content provided by users and interpret and summarize it based on their prompts. Please ensure your responses:
  1. Are objective and accurate based on the web content
  2. Have clear structure and highlight key points
  3. Provide a summary of the main content in Markdown format if no specific question is asked
  4. Use the original language of the website content`
      }`,
    });

    // 计算积分并准备批量扣除记录
    const creditRecords: Array<{ type: UsageType; amount: Decimal }> = [];

    // Jina Reader API 积分
    if (jinaResp.usage?.tokens) {
      creditRecords.push({
        type: 'WEB_READER_API',
        amount: PRICING.WEB_READER_API.mul(jinaResp.usage.tokens),
      });
    }

    // LLM 输入积分
    if (llmUsage?.promptTokens) {
      creditRecords.push({
        type: 'LLM_DEEPSEEK_CHAT_INPUT',
        amount: PRICING.LLM.DEEPSEEK_CHAT.INPUT.mul(llmUsage.promptTokens),
      });
    }

    // LLM 输出积分
    if (llmUsage?.completionTokens) {
      creditRecords.push({
        type: 'LLM_DEEPSEEK_CHAT_OUTPUT',
        amount: PRICING.LLM.DEEPSEEK_CHAT.OUTPUT.mul(llmUsage.completionTokens),
      });
    }

    // 批量扣除积分
    const deductResult = await batchDeductCredit({ userId, records: creditRecords });
    if (!deductResult.success) {
      throw new Error(deductResult.error || 'Failed to deduct credits');
    }

    // 处理部分失败情况
    if (deductResult.failedRecords?.length) {
      console.error('部分积分扣除失败:', deductResult.failedRecords);
    }

    // 移除敏感信息
    delete jinaResp.usage;

    // 计算消费统计
    const getUsage = (type: UsageType): number => Number(creditRecords.find((r) => r.type === type)?.amount || 0);

    // 返回结果
    return successResp({
      result: text,
      usage: {
        total: deductResult.usage?.credits || 0,
        reader: getUsage('WEB_READER_API'),
        llm_input: getUsage('LLM_DEEPSEEK_CHAT_INPUT'),
        llm_output: getUsage('LLM_DEEPSEEK_CHAT_OUTPUT'),
      },
    });
  } catch (error) {
    return errorResp(error);
  }
}
