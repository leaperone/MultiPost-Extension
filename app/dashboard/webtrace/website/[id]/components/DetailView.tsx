/**
 * @file 根据detail参数展示特定类型的详细统计信息
 */

import { Card, CardBody } from '@heroui/react';
import { BrowsersCard } from './BrowsersCard';
import { CountriesCard } from './CountriesCard';
import { CustomEventsCard } from './CustomEventsCard';
import { DevicesCard } from './DevicesCard';
import { OsCard } from './OsCard';
import { PopularPagesCard } from './PopularPagesCard';
import { ReferrersCard } from './ReferrersCard';
import { DetailViewControls } from './DetailViewControls';
import { LanguagesCard } from './LanguagesCard';
import { HostsCard } from './HostsCard';
import { ScreensCard } from './ScreensCard';
import { PageTitlesCard } from './PageTitlesCard';

interface DetailViewProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  detail?: string;
}

export default function DetailView({ websiteId, startDate, endDate, timezone, detail }: DetailViewProps) {
  // 使用传入的detail参数确定要显示的内容
  const selectedDetail = detail || 'browsers';

  // 渲染对应的详细视图组件
  const renderDetailComponent = () => {
    const commonProps = {
      websiteId,
      startDate,
      endDate,
      className: 'h-full',
      timezone,
      isDetail: true,
    };

    switch (selectedDetail) {
      case 'browsers':
        return <BrowsersCard {...commonProps} />;
      case 'countries':
        return <CountriesCard {...commonProps} />;
      case 'events':
        return <CustomEventsCard {...commonProps} />;
      case 'devices':
        return <DevicesCard {...commonProps} />;
      case 'os':
        return <OsCard {...commonProps} />;
      case 'pages':
        return <PopularPagesCard {...commonProps} />;
      case 'referrers':
        return <ReferrersCard {...commonProps} />;
      case 'languages':
        return <LanguagesCard {...commonProps} />;
      case 'hosts':
        return <HostsCard {...commonProps} />;
      case 'screens':
        return <ScreensCard {...commonProps} />;
      case 'pagetitles':
        return <PageTitlesCard {...commonProps} />;
      default:
        return <BrowsersCard {...commonProps} />;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardBody className="p-0">
        <div className="flex h-full flex-row">
          {/* 左侧导航区域 */}
          <div className="w-56">
            <DetailViewControls selectedDetail={selectedDetail} />
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 p-4">{renderDetailComponent()}</div>
        </div>
      </CardBody>
    </Card>
  );
}
