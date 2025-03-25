/**
 * @file 访问来源统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { Card, CardBody, CardHeader, Image } from '@heroui/react';
import { GROUPED_DOMAINS } from '@/lib/constants';

function getGroupedDomain(domain: string) {
  for (const group of GROUPED_DOMAINS) {
    const matches = Array.isArray(group.match) ? group.match : [group.match];
    if (matches.some((match) => domain.includes(match))) {
      return {
        name: group.name,
        domain: group.domain,
      };
    }
  }
  return null;
}

async function getReferrerStats(websiteId: string, startDate: Date, endDate: Date) {
  // 首先获取网站的 domain
  const website = await multipostDb.website.findUnique({
    where: { id: websiteId },
    select: { domain: true },
  });

  const referrers = await multipostDb.websiteEvent.groupBy({
    by: ['referrerDomain'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
      referrerDomain: {
        not: null,
      },
      NOT: {
        referrerDomain: website?.domain,
      },
    },
    _count: true,
    orderBy: {
      _count: {
        referrerDomain: 'desc',
      },
    },
  });

  // 合并相关域名的访问量
  const groupedReferrers = new Map<string, { name: string; count: number; domain: string }>();

  for (const item of referrers) {
    const domain = item.referrerDomain || 'Unknown';
    const groupInfo = getGroupedDomain(domain);

    if (groupInfo) {
      const existing = groupedReferrers.get(groupInfo.domain);
      if (existing) {
        existing.count += item._count;
      } else {
        groupedReferrers.set(groupInfo.domain, {
          name: groupInfo.name,
          count: item._count,
          domain: groupInfo.domain,
        });
      }
    } else {
      groupedReferrers.set(domain, {
        name: domain,
        count: item._count,
        domain: domain,
      });
    }
  }

  const stats = Array.from(groupedReferrers.values());

  // 计算总访问量
  const total = stats.reduce((acc, curr) => acc + curr.count, 0);

  // 转换数据格式并计算百分比
  const formattedStats = stats.map((item) => ({
    name: item.name,
    domain: item.domain,
    count: item.count,
    percentage: (item.count / total) * 100,
    favicon: `https://icons.duckduckgo.com/ip3/${item.domain}.ico`,
  }));

  // 按访问量排序并只返回前5个
  return formattedStats.sort((a, b) => b.count - a.count).slice(0, 5);
}

interface ReferrersCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
}

export async function ReferrersCard({ websiteId, startDate, endDate }: ReferrersCardProps) {
  const stats = await getReferrerStats(websiteId, startDate, endDate);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">访问来源</h2>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {stats.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Image
                  src={item.favicon}
                  alt={`${item.name} favicon`}
                  width={16}
                  height={16}
                  className="rounded-sm"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{item.domain}</p>
                  <p className="text-xs text-gray-500">{item.count.toLocaleString()} 访问</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
