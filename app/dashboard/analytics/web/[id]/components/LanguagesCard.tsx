/**
 * @file 语言使用统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { StatTable } from './StatTable';

/**
 * 格式化语言代码为可读的语言名称
 * @param languageCode 语言代码 (e.g., 'zh-CN', 'en-US')
 * @returns 格式化后的语言名称
 */
function formatLanguage(languageCode: string) {
  try {
    // 尝试使用中文显示语言名称
    const languageNames = new Intl.DisplayNames(['zh-CN'], { type: 'language' });
    const regionNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' });

    // 分割语言代码和地区代码
    const [lang, region] = languageCode.split('-');

    // 获取语言名称
    const languageName = languageNames.of(lang);

    // 如果有地区代码，添加地区信息
    if (region) {
      const regionName = regionNames.of(region);
      return `${languageName} (${regionName})`;
    }

    return languageName;
  } catch (error) {
    // 如果格式化失败，返回原始代码
    return languageCode;
  }
}

async function getLanguageStats(websiteId: string, startDate: Date, endDate: Date, isDetail?: boolean) {
  const languages = await multipostDb.visitorSession.groupBy({
    by: ['language'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
      language: {
        not: null,
      },
    },
    _count: {
      language: true,
    },
    orderBy: {
      _count: {
        language: 'desc',
      },
    },
    take: isDetail ? undefined : 10,
  });

  const total = languages.reduce((acc, curr) => acc + curr._count.language, 0);

  return languages.map((item) => ({
    key: item.language || 'unknown',
    label: item.language ? formatLanguage(item.language) : '未知',
    count: item._count.language,
    percentage: (item._count.language / total) * 100,
  }));
}

interface LanguagesCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  className?: string;
  isDetail?: boolean;
}

export async function LanguagesCard({ websiteId, startDate, endDate, className, isDetail }: LanguagesCardProps) {
  const stats = await getLanguageStats(websiteId, startDate, endDate, isDetail);

  return (
    <StatTable
      title="语言"
      items={stats}
      className={className}
      showMoreButton={!isDetail}
      detailType="languages"
    />
  );
}
