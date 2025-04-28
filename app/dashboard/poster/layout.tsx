export default function PostersLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-full overflow-auto scrollbar-hide">{children}</div>;
}
