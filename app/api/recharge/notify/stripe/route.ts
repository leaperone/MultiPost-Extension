import { type NextRequest, NextResponse } from 'next/server';
import { multipostDb } from '@/lib/db';
import { RechargeStatus } from '@/actions/credit/types';
import { addCredit } from '@/actions/credit';
import { Stripe } from 'stripe';

export const dynamic = 'force-dynamic';

// 初始化Stripe客户端
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

/**
 * 处理Stripe支付回调
 */
export async function POST(request: NextRequest) {
  try {
    // 解析Webhook有效负载
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err) {
      return NextResponse.json({ success: false, message: 'Webhook signature verification failed' }, { status: 400 });
    }

    // 检查事件类型
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // 获取订单ID
      const orderId = session.client_reference_id;
      if (!orderId) {
        return NextResponse.json({ success: false, message: 'Missing order ID' }, { status: 400 });
      }

      // 获取充值记录
      const recharge = await multipostDb.rechargeCredit.findUnique({
        where: { orderId },
      });

      if (!recharge) {
        return NextResponse.json({ success: false, message: 'Recharge record not found' }, { status: 404 });
      }

      if (recharge.status === RechargeStatus.SUCCESS) {
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // 使用事务同时更新充值状态和用户余额
      await multipostDb.$transaction(async (tx) => {
        // 1. 更新充值订单状态
        await tx.rechargeCredit.update({
          where: { orderId },
          data: { status: RechargeStatus.SUCCESS },
        });

        // 2. 更新用户余额
        await addCredit(recharge.userId, recharge.amount, false);
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stripe webhook处理失败:', error);
    return NextResponse.json({ success: false, message: '服务器内部错误' }, { status: 500 });
  }
}
