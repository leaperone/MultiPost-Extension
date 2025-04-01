import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';

export default async function DefaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
