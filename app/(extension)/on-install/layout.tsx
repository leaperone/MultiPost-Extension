import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'On Install | MultiPost',
  description: 'On install for MultiPost',
};

export default function OnInstallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
