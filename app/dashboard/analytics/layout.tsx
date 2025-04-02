import { ReactNode } from 'react';

interface AnalyticsLayoutProps {
  children: ReactNode;
  webs: ReactNode;
}

export default function AnalyticsLayout({ children, webs }: AnalyticsLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto p-4">
        {children}
        {webs}
      </main>
    </div>
  );
}
