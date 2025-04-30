import { NextRequest, NextResponse } from 'next/server';
import { getPresignedDownloadUrl } from '@/lib/bitiful';
import { errorResp } from '@/lib/request';
import { prisma } from '@/lib/db';
import { initFile } from './common';
// import { deductCredit } from '@/actions/credit';
// import { PRICING } from '@/actions/credit/types';
// import { Decimal } from 'decimal.js';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const fileId = (await params).id;
    if (!fileId) {
      return errorResp('fileId is required');
    }

    const { success, file, error } = await initFile(fileId);
    if (!success || !file) {
      throw new Error(error);
    }

    const expiresIn = file.expiredAt ? (file.expiredAt.getTime() - new Date().getTime()) / 1000 : 60 * 60 * 24 * 7; // 7天

    const url = await getPresignedDownloadUrl(file.key, expiresIn);

    await prisma.fileHosting.update({
      where: { id: fileId },
      data: { times: { increment: 1 } },
    });

    // await deductCredit({
    //   userId: file.userId,
    //   type: 'FILE_HOSTING',
    //   amount: PRICING.FILE_HOSTING.mul(new Decimal(file.size).div(new Decimal(1024 * 1024 * 1024))),
    // });

    // 直接重定向到下载URL而不是返回JSON
    return NextResponse.redirect(url);
  } catch (error) {
    return errorResp(error);
  }
}
