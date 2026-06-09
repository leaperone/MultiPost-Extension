import {
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, RefreshCw, SearchIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { adminGetConversations } from '../../actions/support/admin';
import type { SupportStatus } from '../../actions/support/types';
import { useTranslation } from '../../i18n/client';
import { getCategoryLabels, getStatusConfig } from '@/lib/support-utils';

interface ConversationRow {
  id: string;
  subject: string | null;
  status: string;
  category: string;
  priority: string;
  lastMessageContent: string | null;
  lastMessageRole: string | null;
  hasUnreadReply: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

const PAGE_SIZE = 20;

export const Route = createFileRoute('/admin/support')({
  component: AdminSupportPage,
});

function AdminSupportPage() {
  const { t } = useTranslation('support');
  const STATUS_CONFIG = getStatusConfig(t);
  const CATEGORY_LABELS = getCategoryLabels(t);
  const [data, setData] = useState<ConversationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SupportStatus | ''>('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const result = await adminGetConversations({
      data: {
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
        category: category || undefined,
        search: search || undefined,
      },
    });
    if (result.success && result.data) {
      setData(result.data.conversations as ConversationRow[]);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [page, status, category, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Support Tickets</h2>
        <Button
          size="sm"
          variant="flat"
          isIconOnly
          onPress={load}
          isDisabled={loading}
          title="Refresh">
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          size="sm"
          placeholder="Search messages..."
          value={search}
          onValueChange={setSearch}
          startContent={<SearchIcon className="size-4" />}
          className="w-60"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setPage(1);
              void load();
            }
          }}
        />
        <Select
          size="sm"
          placeholder="Status"
          className="w-32"
          selectedKeys={status ? [status] : []}
          onSelectionChange={(keys) => {
            setStatus(String(Array.from(keys)[0] ?? '') as SupportStatus | '');
            setPage(1);
          }}>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <SelectItem key={key}>{val.label}</SelectItem>
          ))}
        </Select>
        <Select
          size="sm"
          placeholder="Category"
          className="w-32"
          selectedKeys={category ? [category] : []}
          onSelectionChange={(keys) => {
            setCategory(String(Array.from(keys)[0] ?? ''));
            setPage(1);
          }}>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <SelectItem key={key}>{label}</SelectItem>
          ))}
        </Select>
        {(status || category || search) && (
          <Button
            size="sm"
            variant="flat"
            onPress={() => {
              setStatus('');
              setCategory('');
              setSearch('');
              setPage(1);
            }}>
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <Table
          aria-label="Support tickets"
          removeWrapper>
          <TableHeader>
            <TableColumn>Ticket</TableColumn>
            <TableColumn width={120}>User</TableColumn>
            <TableColumn width={80}>Category</TableColumn>
            <TableColumn width={80}>Status</TableColumn>
            <TableColumn width={120}>Updated</TableColumn>
          </TableHeader>
          <TableBody emptyContent="No tickets">
            {data.map((row) => {
              const statusInfo =
                STATUS_CONFIG[row.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open;
              const isUserLast = row.lastMessageRole === 'user';
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      to="/admin/support/$id"
                      params={{ id: row.id }}
                      className="block hover:underline">
                      {row.subject && <p className="line-clamp-1 text-sm font-medium">{row.subject}</p>}
                      <p className={`line-clamp-1 text-xs ${row.subject ? 'text-default-400' : 'text-sm'}`}>
                        {isUserLast && <span className="text-default-400">User: </span>}
                        {!isUserLast && row.lastMessageRole === 'agent' && (
                          <span className="text-default-400">Agent: </span>
                        )}
                        {row.lastMessageContent || 'New conversation'}
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">
                      {row.user?.name || row.user?.email?.split('@')[0] || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">
                      {CATEGORY_LABELS[row.category as keyof typeof CATEGORY_LABELS] ?? row.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={
                        statusInfo.color as
                          | 'default'
                          | 'primary'
                          | 'secondary'
                          | 'success'
                          | 'warning'
                          | 'danger'
                      }>
                      {statusInfo.label}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-default-500">
                      {new Date(row.updatedAt).toLocaleString(undefined, {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-default-500">Total: {total}</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              isIconOnly
              isDisabled={page <= 1}
              onPress={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="flat"
              isIconOnly
              isDisabled={page >= totalPages}
              onPress={() => setPage((p) => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
