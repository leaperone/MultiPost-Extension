import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Extension Installed - MultiPost',
  description: 'Welcome to MultiPost browser extension. Get started with multi-platform publishing.',
};

export default function OnInstallPage() {
  redirect('/');
}
