import {
  Chip,
  Pagination,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { formatDistance } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useCallback, useEffect, useState } from 'react';

import { getCreditUsageHistory } from '../../../../actions/credit';
import { useTranslation } from '../../../../i18n/client';

interface CreditUsage {
  id: string;
  type: string;
  amount: number;
  isFree: boolean;
  createdAt: Date;
}

interface CreditUsageResponse {
  success: boolean;
  data?: {
    id: string;
    type: string;
    amount: number;
    isFree: boolean;
    createdAt: string | Date;
  }[];
  error?: string;
}

const USAGE_TYPE_MAP = {
  WEB_READER_API: 'Web Reader API',
  WEB_SEARCH_API: 'Web Search API',
  SOCIAL_MEDIA_X: 'Social Media X',
} as const;

function getUsageType(type: string): string {
  return USAGE_TYPE_MAP[type as keyof typeof USAGE_TYPE_MAP] || type;
}

export default function CreditUsageTable() {
  const { t } = useTranslation('settings');
  const [usageData, setUsageData] = useState<CreditUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const fetchUsageData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response: CreditUsageResponse = await getCreditUsageHistory();
      if (response.success && response.data) {
        setUsageData(
          response.data.map((item) => ({
            ...item,
            createdAt: new Date(item.createdAt),
          })),
        );
      }
    } catch (error) {
      console.error('Failed to fetch usage history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsageData();
  }, [fetchUsageData]);

  const pages = Math.ceil(usageData.length / rowsPerPage);
  const items = usageData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="w-full">
      <Table
        aria-label={t('credit_usage.usage_history.title')}
        bottomContent={
          pages > 0 ? (
            <div className="flex w-full justify-center">
              <Pagination
                isCompact
                showControls
                showShadow
                color="primary"
                page={page}
                total={pages}
                onChange={setPage}
              />
            </div>
          ) : null
        }>
        <TableHeader>
          <TableColumn>{t('credit_usage.usage_history.columns.type')}</TableColumn>
          <TableColumn>{t('credit_usage.usage_history.columns.amount')}</TableColumn>
          <TableColumn>{t('credit_usage.usage_history.columns.category')}</TableColumn>
          <TableColumn>{t('credit_usage.usage_history.columns.time')}</TableColumn>
        </TableHeader>
        <TableBody
          loadingContent={<Spinner label={t('credit_usage.usage_history.loading')} />}
          loadingState={isLoading ? 'loading' : 'idle'}
          emptyContent={!isLoading ? t('credit_usage.usage_history.empty') : null}>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{getUsageType(item.type)}</TableCell>
              <TableCell>${item.amount.toFixed(6)}</TableCell>
              <TableCell>
                <Chip
                  color={item.isFree ? 'success' : 'primary'}
                  variant="flat"
                  size="sm">
                  {item.isFree
                    ? t('credit_usage.usage_history.category_labels.free')
                    : t('credit_usage.usage_history.category_labels.paid')}
                </Chip>
              </TableCell>
              <TableCell>
                {formatDistance(item.createdAt, new Date(), {
                  addSuffix: true,
                  locale: zhCN,
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
