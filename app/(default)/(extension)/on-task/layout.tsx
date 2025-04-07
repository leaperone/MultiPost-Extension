import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'On Task | MultiPost',
  description: 'On task for MultiPost',
};

export default function OnTaskLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
