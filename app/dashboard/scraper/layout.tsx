import Header from '../components/Header';
import ScraperTabs from './Tabs';

export default function ScraperLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid h-full grid-rows-[auto_1fr_auto] gap-4">
      <Header title="Web Scraper" />
      {/* Tabs Navigation */}
      <div className="mx-auto w-full max-w-7xl">
        <ScraperTabs />
      </div>

      {/* Main Content */}
      <div className="w-full overflow-auto">{children}</div>
    </div>
  );
}
