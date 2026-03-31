import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | MultiPost',
  description: 'Settings for MultiPost',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
