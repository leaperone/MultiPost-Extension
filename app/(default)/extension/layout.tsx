import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Install MultiPost Browser Extension - Chrome & Edge',
  description: 'Download and install the MultiPost browser extension for Chrome and Edge. One-click multi-platform social media publishing to Weibo, Xiaohongshu, Twitter, LinkedIn and 10+ platforms.',
};

export default function ExtensionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
