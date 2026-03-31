'use client';

import { Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useFormStatus } from 'react-dom';
import { ReactNode } from 'react';

interface SubmitButtonProps {
  children: ReactNode;
  icon?: string;
  className?: string;
}

export function SubmitButton({ children, icon, className = 'w-full' }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className={className}
      isLoading={pending}
      startContent={
        !pending &&
        icon && (
          <Icon
            icon={icon}
            className="size-6"
          />
        )
      }>
      {children}
    </Button>
  );
}
