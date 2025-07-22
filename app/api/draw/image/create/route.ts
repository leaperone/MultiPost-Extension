import { auth } from '@/auth';
import { getPrompt, ImageGenerationSchema, ImageGenerationStatus } from '../types';
import { preCheckCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';
import { multipostDb } from '@/lib/db';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !session.user.id) {
    throw new Error('Unauthorized');
  }

  const body = await req.json();
  // 用 zod 校验 task
  const parseResult = ImageGenerationSchema.safeParse(body.task);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: '参数校验失败', issues: parseResult.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const task = parseResult.data;

  if (!(await preCheckCredit(session.user.id, PRICING.IMAGE_GENERATION.mul(task.number).toNumber()))) {
    throw new Error('Insufficient credits');
  }

  // 使用 getPrompt 拼接 composition、color、style 的提示词
  let extraPrompt = task.prompt;
  if (task.size) {
    extraPrompt = `size: ${task.size}\n${extraPrompt}`;
  }
  if (task.composition) {
    const compositionPrompt = getPrompt('composition', task.composition);
    if (compositionPrompt) extraPrompt = `${compositionPrompt}\n${extraPrompt}`;
  }
  if (task.color) {
    const colorPrompt = getPrompt('color', task.color);
    if (colorPrompt) extraPrompt = `${colorPrompt}\n${extraPrompt}`;
  }
  if (task.style) {
    const stylePrompt = getPrompt('style', task.style);
    if (stylePrompt) extraPrompt = `${stylePrompt}\n${extraPrompt}`;
  }

  const newTask = await multipostDb.imageGeneration.create({
    data: {
      userId: session.user.id,
      prompt: task.prompt,
      extraPrompt,
      images: task.images,
      number: task.number,
      size: task.size.toString(),
      status: ImageGenerationStatus.PENDING,
    },
  });

  return new Response(JSON.stringify({ id: newTask.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
