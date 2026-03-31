import { type NextRequest, NextResponse } from 'next/server';
import { multipostDb } from '@/lib/db';
import { RechargeStatus } from '@/actions/credit/types';
import { addCredit } from '@/actions/credit';

export async function POST(request: NextRequest) {
  try {
    const { secret, orderId } = await request.json();

    if (secret !== process.env.INTERNAL_SECRET) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const recharge = await multipostDb.rechargeCredit.findUnique({
      where: {
        orderId,
      },
    });

    if (!recharge) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    if (recharge.status === RechargeStatus.SUCCESS) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 使用事务同时更新充值状态和用户余额
    await multipostDb.$transaction(async (tx) => {
      // 1. 更新充值订单状态
      await tx.rechargeCredit.update({
        where: { orderId },
        data: { status: RechargeStatus.SUCCESS },
      });

      // 2. 更新用户余额 - 使用 upsert 操作
      await addCredit(recharge.userId, recharge.amount, false);

      // 3. 赠送积分
      //   await tx.rechargeCredit.create({
      //     data: {
      //       userId: recharge.userId,
      //       orderId: `MP-FREE-${nanoid(32)}`,
      //       type: RechargeType.FREE,
      //       amount: recharge.amount,
      //       status: RechargeStatus.SUCCESS,
      //     },
      //   });

      //   await tx.credit.update({
      //     where: { userId: recharge.userId },
      //     data: {
      //       freeCredits: {
      //         increment: new Decimal(recharge.amount.toString()),
      //       },
      //     },
      //   });
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('充值回调处理失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
