import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Install Extension | MultiPost',
  description: 'Install the MultiPost extension',
};

export default function ExtensionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
