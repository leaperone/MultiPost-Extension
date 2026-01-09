'use client';

import { getUserSelfCredit } from '@/actions/credit';
import { Button } from '@heroui/react';
import { BadgeAlertIcon, DollarSignIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useState } from 'react';

export function BalanceButtonClient({
  className,
  size = 'sm',
  alert = 99999,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  alert?: number;
}) {
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const fetchBalance = async () => {
      const balance = await getUserSelfCredit();
      setBalance(balance.totalCredits);
    };
    fetchBalance();
  }, []);

  return (
    <Link href="/dashboard/settings/credit-and-usage">
      <Button
        size={size}
        variant="flat"
        color="primary"
        startContent={<DollarSignIcon className="size-4" />}
        endContent={balance < alert ? <BadgeAlertIcon className="size-4 text-danger-500" /> : null}
        className={className}>
        {balance.toFixed(2)}
      </Button>
    </Link>
  );
}

export default BalanceButtonClient;
