/**
 * @file Admin Recharge page
 * @description Recharge management UI for admin
 * @author harrywong
 * @date 2024-06-09
 */

'use client';

import React from 'react';
import { getRechargeHistory, adminRecharge } from './action';
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@heroui/react';
import { CheckCircle, ChevronLeft, Plus } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Link } from '@heroui/react';

const rechargeSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, '金额必须为正数'),
});

type RechargeFormData = z.infer<typeof rechargeSchema>;

interface RechargeRecord {
  id: string;
  orderId: string;
  type: string;
  amount: string;
  status: string;
  createdAt: string;
  user: {
    email: string;
    name: string | null;
  };
}

const tableColumns = [
  { key: 'createdAt', label: '时间' },
  { key: 'orderId', label: '订单号' },
  { key: 'amount', label: '金额 ($)', align: 'end' as const },
  { key: 'status', label: '状态' },
  { key: 'type', label: '充值类型' },
  { key: 'user', label: '用户名' },
  { key: 'email', label: '邮箱' },
];

export default function AdminRechargePage() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { toast } = useToast();
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

  const [recharges, setRecharges] = React.useState<RechargeRecord[]>([]);

  React.useEffect(() => {
    const fetchRecharges = async () => {
      const { data = [] } = await getRechargeHistory();
      setRecharges(data);
    };
    fetchRecharges();
  }, []);

  const onSubmit = async (data: RechargeFormData) => {
    try {
      const result = await adminRecharge({
        ...data,
        amount: parseFloat(data.amount),
      });
      if (result.success) {
        toast({
          title: '充值成功',
          description: '用户余额已更新',
        });
        reset();
        onClose();
        // 刷新充值记录
        const { data: newRecharges = [] } = await getRechargeHistory();
        setRecharges(newRecharges);
      } else {
        toast({
          title: '充值失败',
          description: result.message || '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '充值失败',
        description: '发生未知错误，请稍后重试',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex max-w-7xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          as={Link}
          href="/admin"
          startContent={<ChevronLeft className="size-4" />}>
          返回
        </Button>
        <h1 className="text-3xl font-bold">充值管理</h1>
        <Button
          onPress={onOpen}
          color="primary"
          startContent={<Plus className="size-4" />}>
          新增充值
        </Button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="3xl"
        scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">用户充值</ModalHeader>
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
                              label="用户邮箱"
                              placeholder="请输入用户邮箱"
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
                              label="充值金额"
                              placeholder="请输入充值金额"
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
                    <h2 className="mb-4 text-xl font-semibold text-gray-700">充值操作说明</h2>
                    <div className="space-y-3 text-gray-600">
                      <p className="flex items-center">
                        <CheckCircle className="mr-2 size-5 text-green-500" /> 输入用户邮箱进行充值
                      </p>
                      <p className="flex items-center">
                        <CheckCircle className="mr-2 size-5 text-green-500" /> 选择充值类型和金额
                      </p>
                      <p className="flex items-center">
                        <CheckCircle className="mr-2 size-5 text-green-500" /> 充值后系统会自动记录并增加用户余额
                      </p>
                      <p className="flex items-center">
                        <CheckCircle className="mr-2 size-5 text-green-500" /> 充值成功后可在下方查看充值记录
                      </p>
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}>
                  取消
                </Button>
                <Button
                  type="submit"
                  form="rechargeForm"
                  color="primary"
                  isLoading={isSubmitting}>
                  确认充值
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Table aria-label="充值记录表格">
        <TableHeader columns={tableColumns}>
          {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
        </TableHeader>
        <TableBody items={recharges}>
          {(recharge) => (
            <TableRow key={recharge.id}>
              <TableCell>{format(new Date(recharge.createdAt), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
              <TableCell>{recharge.orderId}</TableCell>
              <TableCell className="text-end">{parseFloat(recharge.amount).toFixed(2)}</TableCell>
              <TableCell>
                <Chip
                  size="sm"
                  color={recharge.status === 'completed' ? 'success' : 'warning'}
                  variant="flat">
                  {recharge.status === 'completed' ? '已完成' : '处理中'}
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
              <TableCell>{recharge.user.email}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
