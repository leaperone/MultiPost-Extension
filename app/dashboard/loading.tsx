import CompassLoader from '@/components/LoadingAnimate/SafariCompass';

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <CompassLoader />
    </div>
  );
}
