'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { RechargeStatus, RechargeType } from '@/actions/credit/types';
import { nanoid } from 'nanoid';
import { auth } from '@/auth';
import { isAdmin } from '@/actions/admin';

// 充值表单验证
const rechargeSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  amount: z.number().positive('金额必须为正数'),
});

type RechargeFormData = z.infer<typeof rechargeSchema>;

/**
 * 管理员为用户充值
 * @description 向特定邮箱用户充值免费点数，并记录交易
 */
export async function adminRecharge(formData: RechargeFormData) {
  const session = await auth();
  if (!session) {
    return { success: false, message: '请先登录' };
  }
  if (!isAdmin(session.user.email?.toString() ?? '')) {
    return { success: false, message: '您不是管理员' };
  }

  try {
    // 验证表单数据
    const validatedData = rechargeSchema.parse(formData);
    const { email, amount } = validatedData;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      include: { Credit: true },
    });

    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    // 生成唯一订单ID
    const orderId = `MP-${nanoid(32)}`;

    // 创建充值记录
    await prisma.rechargeCredit.create({
      data: {
        userId: user.id,
        orderId,
        type: RechargeType.ADMIN,
        amount,
        status: RechargeStatus.SUCCESS,
      },
    });

    // 更新用户余额
    if (user.Credit.length > 0) {
      // 用户已有余额记录，更新免费点数
      await prisma.credit.update({
        where: { userId: user.id },
        data: {
          freeCredits: { increment: amount },
        },
      });
    } else {
      // 用户没有余额记录，创建新的
      await prisma.credit.create({
        data: {
          userId: user.id,
          credits: 0,
          freeCredits: amount,
        },
      });
    }

    // 刷新页面数据
    revalidatePath('/admin/recharge');

    return { success: true, message: '充值成功' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: '表单数据验证失败', errors: error.errors };
    }

    console.error('充值失败:', error);
    return { success: false, message: '充值失败，请稍后再试' };
  }
}

/**
 * 获取所有充值记录
 */
export async function getRechargeHistory() {
  try {
    const recharges = await prisma.rechargeCredit.findMany({
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 转换 Decimal 类型为字符串，日期类型为 ISO 字符串
    const serializedRecharges = recharges.map((recharge) => ({
      ...recharge,
      amount: recharge.amount.toString(),
      createdAt: recharge.createdAt.toISOString(),
      updatedAt: recharge.updatedAt.toISOString(),
    }));

    return { success: true, data: serializedRecharges };
  } catch (error) {
    console.error('获取充值记录失败:', error);
    return { success: false, message: '获取充值记录失败' };
  }
}
