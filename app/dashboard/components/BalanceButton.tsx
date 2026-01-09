'use server';

import { getCredit } from '@/actions/credit';
import { auth } from '@/auth';
import { Button } from '@heroui/react';
import { BadgeAlertIcon, DollarSignIcon } from 'lucide-react';
import Link from 'next/link';

export async function BalanceButton({
  alert = 99999,
  className,
  size = 'md',
}: {
  alert?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const balance = await getCredit(session.user.id);

  return (
    <Link href="/dashboard/settings/credit-and-usage">
      <Button
        variant="flat"
        color="primary"
        size={size}
        startContent={<DollarSignIcon className="size-4" />}
        endContent={balance.totalCredits < alert ? <BadgeAlertIcon className="size-4 text-danger-500" /> : null}
        className={className}>
        {balance.totalCredits.toFixed(2)}
      </Button>
    </Link>
  );
}

export default BalanceButton;
