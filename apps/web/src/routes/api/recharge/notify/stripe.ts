import { createFileRoute } from '@tanstack/react-router';
import { Stripe } from 'stripe';

import { grantRechargeCredit } from './-recharge';

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || 'secret', {
  apiVersion: '2024-06-20',
});

export const Route = createFileRoute('/api/recharge/notify/stripe')({
  server: {
    handlers: {
      POST,
    },
  },
});

async function POST({ request }: { request: Request }) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || '',
      );
    } catch {
      return Response.json(
        { success: false, message: 'Webhook signature verification failed' },
        { status: 400 },
      );
    }

    if (event.type !== 'checkout.session.completed') {
      return Response.json({ success: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.client_reference_id;
    if (!orderId) {
      return Response.json({ success: false, message: 'Missing order ID' }, { status: 400 });
    }

    const result = await grantRechargeCredit(orderId);
    if (result === 'not_found') {
      return Response.json(
        { success: false, message: 'Recharge record not found' },
        { status: 404 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Stripe webhook处理失败:', error);
    return Response.json({ success: false, message: '服务器内部错误' }, { status: 500 });
  }
}
