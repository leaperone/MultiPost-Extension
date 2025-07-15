import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drafts | MultiPost',
  description: 'Drafts for MultiPost',
};

export default function DraftsLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-full">{children}</div>;
}
