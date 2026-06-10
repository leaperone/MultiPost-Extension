import { dollarToYuan } from '@/src/actions/credit/types';
import Decimal from 'decimal.js';
import ky from 'ky';

export async function requestAlipayUrl(orderId: string, amount: Decimal, returnUrl: string) {
  const apiParams = {
    secret: process.env.INTERNAL_SECRET,
    orderId,
    amount: amount.mul(dollarToYuan).toString(),
    returnUrl,
    payType: 'alipay',
  };

  const resp = await ky
    .post<{ success: boolean; result: string }>(`${process.env.TWOSOMEREN_BASE_URL}/api/internal/mp/recharge`, {
      json: apiParams,
    })
    .json();

  return resp;
}
