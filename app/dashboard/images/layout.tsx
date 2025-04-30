import Header from '../components/Header';

export default function ImagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full overflow-auto scrollbar-hide">
      <Header title="Image Generator" />
      {children}
    </div>
  );
}
