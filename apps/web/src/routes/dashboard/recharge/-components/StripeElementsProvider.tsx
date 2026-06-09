import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { type ReactNode } from 'react';

const publishableKey =
  (import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined);

const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function StripeElementsProvider({ children }: { children: ReactNode }) {
  return <Elements stripe={stripePromise}>{children}</Elements>;
}
