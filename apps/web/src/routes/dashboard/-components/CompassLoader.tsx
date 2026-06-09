export default function CompassLoader() {
  return (
    <div
      className="relative flex size-40 items-center justify-center"
      role="status"
      aria-label="Loading">
      <div className="absolute inset-4 rounded-full border-[12px] border-blue-500/20 border-t-blue-500 animate-spin" />
      <div className="absolute inset-10 rounded-full border border-foreground/15" />
      <div className="absolute size-4 rounded-full bg-foreground" />
      <div className="absolute h-24 w-8 animate-[spin_2s_linear_infinite]">
        <div
          className="absolute left-1/2 top-0 h-12 w-5 -translate-x-1/2 bg-red-500"
          style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}
        />
        <div
          className="absolute bottom-0 left-1/2 h-12 w-5 -translate-x-1/2 bg-foreground/80"
          style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
        />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
