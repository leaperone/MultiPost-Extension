import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Blog - MultiPost',
  description: 'Latest articles, tutorials, and updates about social media publishing and MultiPost features.',
};

export default function BlogIndexPage() {
  redirect('/blog/en');
}
