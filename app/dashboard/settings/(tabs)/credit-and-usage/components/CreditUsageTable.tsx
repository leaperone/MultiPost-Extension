'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Pagination,
  Spinner,
} from '@heroui/react';
import { formatDistance } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getCreditUsageHistory } from '../action';
import { getUsageType } from '../types';

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

export default function CreditUsageTable() {
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
      console.error('获取使用记录失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  const pages = Math.ceil(usageData.length / rowsPerPage);
  const items = usageData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="w-full">
      <Table
        aria-label="余额使用记录"
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
          <TableColumn>类型</TableColumn>
          <TableColumn>金额</TableColumn>
          <TableColumn>类别</TableColumn>
          <TableColumn>时间</TableColumn>
        </TableHeader>
        <TableBody
          loadingContent={<Spinner label="加载中..." />}
          loadingState={isLoading ? 'loading' : 'idle'}
          emptyContent={!isLoading ? '暂无使用记录' : null}>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{getUsageType(item.type)}</TableCell>
              <TableCell>${item.amount.toFixed(6)}</TableCell>
              <TableCell>
                <Chip
                  color={item.isFree ? 'success' : 'primary'}
                  variant="flat"
                  size="sm">
                  {item.isFree ? '免费额度' : '付费额度'}
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
