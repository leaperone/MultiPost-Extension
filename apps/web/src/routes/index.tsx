import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">MultiPost (TanStack Start scaffold)</h1>
      </div>
    </main>
  );
}
