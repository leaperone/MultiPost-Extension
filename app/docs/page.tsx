import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Documentation - MultiPost',
  description: 'MultiPost documentation and guides for social media publishing.',
};

export default function DocsIndexPage() {
  redirect('/docs/zh');
}
