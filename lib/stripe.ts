import { Stripe } from 'stripe';
import { auth } from '@/auth';
import Decimal from 'decimal.js';

// 初始化Stripe客户端
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || 'secret', {
  apiVersion: '2024-06-20', // 使用Acacia版本
});

/**
 * 创建Stripe支付会话
 * @param orderId 订单ID
 * @param amount 金额
 * @param returnUrl 支付完成后的回调地址
 * @returns
 */
export async function createStripeCheckoutSession(orderId: string, amount: Decimal, returnUrl: string) {
  const user_session = await auth();
  if (!user_session?.user?.email) {
    return {
      success: false,
      error: '用户未登录',
    };
  }

  try {
    // 创建Stripe Checkout Session
    const session = await stripeClient.checkout.sessions.create({
      // payment_method_types: ['card'],
      customer_email: user_session.user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'MultiPost Credits',
              description: 'Credits for MultiPost platform',
            },
            unit_amount: Math.round(Number(amount) * 100), // Stripe使用美分为单位，转换为整数
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: returnUrl,
      cancel_url: returnUrl,
      client_reference_id: orderId,
    });

    return {
      success: true,
      result: session.url || '',
    };
  } catch (error) {
    console.error('Stripe创建支付会话失败:', error);
    return {
      success: false,
      error: '创建支付会话失败，请稍后再试',
    };
  }
}
