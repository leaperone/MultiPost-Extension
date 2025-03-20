import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Publish | MultiPost',
  description: 'Publish content to multiple social media platforms with one click.',
};

export default function OnInstallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
