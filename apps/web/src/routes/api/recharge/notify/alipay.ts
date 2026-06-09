import { createFileRoute } from '@tanstack/react-router';

import { extractBearerToken, safeCompareSecret } from '../../../../lib/secret';
import { grantRechargeCredit } from './-recharge';

export const Route = createFileRoute('/api/recharge/notify/alipay')({
  server: {
    handlers: {
      POST,
    },
  },
});

async function POST({ request }: { request: Request }) {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!safeCompareSecret(token, process.env.INTERNAL_SECRET)) {
      return Response.json({ success: false }, { status: 401 });
    }

    const { orderId } = (await request.json()) as { orderId?: unknown };
    if (typeof orderId !== 'string' || !orderId) {
      return Response.json({ success: false }, { status: 400 });
    }

    const result = await grantRechargeCredit(orderId);
    if (result === 'not_found') {
      return Response.json({ success: false }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('充值回调处理失败:', error);
    return Response.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
