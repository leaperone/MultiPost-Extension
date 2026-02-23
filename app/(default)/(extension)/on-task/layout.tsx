import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Publishing Task - MultiPost',
  description: 'Execute your multi-platform publishing task with MultiPost.',
};

export default function OnTaskLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
