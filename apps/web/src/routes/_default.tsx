import { Outlet, createFileRoute } from '@tanstack/react-router';

import Footer from '../components/Footer';
import Header from '../components/Header';

export const Route = createFileRoute('/_default')({
  component: DefaultLayout,
});

function DefaultLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
