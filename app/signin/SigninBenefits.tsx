'use client';

import { Card, CardBody, CardHeader } from '@heroui/react';
import { Share2Icon, SparklesIcon, GiftIcon } from 'lucide-react';
import { useTranslation } from '@/i18n/client';

interface BenefitItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const BenefitItem = ({ icon, title, description }: BenefitItemProps) => (
  <div className="flex gap-3">
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground/10">
      {icon}
    </div>
    <div className="flex-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);

export function SigninBenefits() {
  const { t } = useTranslation('auth');

  const benefits = [
    {
      icon: <Share2Icon className="size-5" />,
      title: t('signin.benefits.features.multiplatform.title'),
      description: t('signin.benefits.features.multiplatform.description'),
    },
    {
      icon: <SparklesIcon className="size-5" />,
      title: t('signin.benefits.features.ai_creation.title'),
      description: t('signin.benefits.features.ai_creation.description'),
    },
    {
      icon: <GiftIcon className="size-5" />,
      title: t('signin.benefits.features.free_trial.title'),
      description: t('signin.benefits.features.free_trial.description'),
    },
  ];

  return (
    <Card className="border-none bg-background/60 shadow-small backdrop-blur-md backdrop-saturate-150 dark:bg-default-100/50">
      <CardHeader className="flex-col items-start pb-4">
        <h2 className="text-lg font-bold text-foreground">
          {t('signin.benefits.title')}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t('signin.benefits.subtitle')}
        </p>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {benefits.map((benefit, index) => (
          <BenefitItem key={index} {...benefit} />
        ))}
      </CardBody>
    </Card>
  );
}
