import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Chip,
  Input,
  Link as HeroLink,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from '@heroui/react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import { CheckCircle, ChevronLeft, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  adminRecharge,
  getRechargeHistory,
  type RechargeRecord,
} from '../../actions/admin/recharge';
import { useTranslation } from '../../i18n/client';

const createRechargeSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().email(t('recharge.validation.invalid_email')),
    amount: z
      .string()
      .refine(
        (val) => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) > 0,
        t('recharge.validation.positive_amount'),
      ),
  });

interface RechargeFormData {
  email: string;
  amount: string;
}

export const Route = createFileRoute('/admin/recharge')({
  component: AdminRechargePage,
});

function AdminRechargePage() {
  const { t } = useTranslation('admin');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const rechargeSchema = useMemo(() => createRechargeSchema(t), [t]);

  const tableColumns = useMemo(
    () => [
      { key: 'createdAt', label: t('recharge.columns.time') },
      { key: 'orderId', label: t('recharge.columns.order_id') },
      { key: 'amount', label: `${t('recharge.columns.amount')} ($)`, align: 'end' as const },
      { key: 'status', label: t('recharge.columns.status') },
      { key: 'type', label: t('recharge.columns.type') },
      { key: 'user', label: t('recharge.columns.username') },
      { key: 'email', label: t('recharge.columns.email') },
    ],
    [t],
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RechargeFormData>({
    resolver: zodResolver(rechargeSchema),
    defaultValues: {
      amount: '',
    },
  });

  const [recharges, setRecharges] = useState<RechargeRecord[]>([]);

  const fetchRecharges = async () => {
    const { data = [] } = await getRechargeHistory({ data: {} });
    setRecharges(data);
  };

  useEffect(() => {
    void fetchRecharges();
  }, []);

  const onSubmit = async (data: RechargeFormData) => {
    try {
      const result = await adminRecharge({
        data: {
          ...data,
          amount: Number.parseFloat(data.amount),
        },
      });
      if (result.success) {
        toast.success(t('recharge.success.title'), {
          description: t('recharge.success.balance_updated'),
        });
        reset();
        onClose();
        await fetchRecharges();
      } else {
        toast.error(t('recharge.error.title'), {
          description: result.message || t('recharge.error.retry'),
        });
      }
    } catch {
      toast.error(t('recharge.error.title'), {
        description: t('recharge.error.unknown'),
      });
    }
  };

  return (
    <div className="flex max-w-7xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link to="/admin">
          <Button startContent={<ChevronLeft className="size-4" />}>{t('recharge.back')}</Button>
        </Link>
        <h1 className="text-3xl font-bold">{t('recharge.title')}</h1>
        <Button
          onPress={onOpen}
          color="primary"
          startContent={<Plus className="size-4" />}>
          {t('recharge.add_recharge')}
        </Button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="3xl"
        scrollBehavior="inside">
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader className="flex flex-col gap-1">{t('recharge.user_recharge')}</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <form
                      id="rechargeForm"
                      onSubmit={handleSubmit(onSubmit)}
                      className="space-y-4">
                      <div>
                        <Controller
                          name="email"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="email"
                              label={t('recharge.form.user_email')}
                              placeholder={t('recharge.form.email_placeholder')}
                              errorMessage={errors.email?.message}
                              isInvalid={!!errors.email}
                            />
                          )}
                        />
                      </div>

                      <div>
                        <Controller
                          name="amount"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="number"
                              label={t('recharge.form.amount')}
                              placeholder={t('recharge.form.amount_placeholder')}
                              min="0"
                              step="0.01"
                              errorMessage={errors.amount?.message}
                              isInvalid={!!errors.amount}
                            />
                          )}
                        />
                      </div>
                    </form>
                  </div>

                  <div>
                    <h2 className="mb-4 text-xl font-semibold text-gray-700">
                      {t('recharge.instructions.title')}
                    </h2>
                    <div className="space-y-3 text-gray-600">
                      <p className="flex items-center">
                        <CheckCircle className="mr-2 size-5 text-green-500" /> {t('recharge.instructions.step1')}
                      </p>
                      <p className="flex items-center">
                        <CheckCircle className="mr-2 size-5 text-green-500" /> {t('recharge.instructions.step2')}
                      </p>
                      <p className="flex items-center">
                        <CheckCircle className="mr-2 size-5 text-green-500" /> {t('recharge.instructions.step3')}
                      </p>
                      <p className="flex items-center">
                        <CheckCircle className="mr-2 size-5 text-green-500" /> {t('recharge.instructions.step4')}
                      </p>
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={close}>
                  {t('recharge.form.cancel')}
                </Button>
                <Button
                  type="submit"
                  form="rechargeForm"
                  color="primary"
                  isLoading={isSubmitting}>
                  {t('recharge.form.confirm')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Table aria-label={t('recharge.table_label')}>
        <TableHeader columns={tableColumns}>
          {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
        </TableHeader>
        <TableBody items={recharges}>
          {(recharge) => (
            <TableRow key={recharge.id}>
              <TableCell>{format(new Date(recharge.createdAt), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
              <TableCell>{recharge.orderId}</TableCell>
              <TableCell className="text-end">{Number.parseFloat(recharge.amount).toFixed(2)}</TableCell>
              <TableCell>
                <Chip
                  size="sm"
                  color={recharge.status === 'completed' ? 'success' : 'warning'}
                  variant="flat">
                  {recharge.status === 'completed' ? t('recharge.status.completed') : t('recharge.status.processing')}
                </Chip>
              </TableCell>
              <TableCell>
                <Chip
                  size="sm"
                  variant="flat">
                  {recharge.type}
                </Chip>
              </TableCell>
              <TableCell>{recharge.user.name || '-'}</TableCell>
              <TableCell>
                <HeroLink href={`mailto:${recharge.user.email}`}>{recharge.user.email}</HeroLink>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
