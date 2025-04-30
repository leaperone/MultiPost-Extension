'use server';

import { getCredit } from '@/actions/credit';
import { auth } from '@/auth';
import { Button, Link } from '@heroui/react';
import { BadgeAlertIcon, DollarSignIcon } from 'lucide-react';

export async function BalanceButton({ alert = 99999 }: { alert?: number }) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const balance = await getCredit(session.user.id);

  return (
    <Button
      as={Link}
      href="/dashboard/settings/credit-and-usage"
      variant="flat"
      color="primary"
      startContent={<DollarSignIcon className="size-4" />}
      endContent={balance.totalCredits < alert ? <BadgeAlertIcon className="size-4 text-danger-500" /> : null}>
      {balance.totalCredits.toFixed(2)}
    </Button>
  );
}

export default BalanceButton;
