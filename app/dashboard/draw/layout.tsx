import { Metadata } from 'next';
import Header from '../components/Header';
import HeaderTabs from './components/Tabs';

export const metadata: Metadata = {
  title: 'Draw',
  description: 'Draw',
};

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <HeaderTabs />
        <Header />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">{children}</div>
    </div>
  );
}
