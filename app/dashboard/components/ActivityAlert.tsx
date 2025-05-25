'use client';

import { Alert, Button, Link } from '@heroui/react';
import { ArrowRightIcon, PartyPopperIcon, SparklesIcon, CrownIcon } from 'lucide-react';
import { useTranslation } from '@/i18n/client';
import Autoplay from 'embla-carousel-autoplay';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

export function ActivityAlert() {
  const { t } = useTranslation('dashboard');

  // Get alerts from translation
  const alerts = t('activity.alerts', { returnObjects: true }) as Array<{
    title: string;
    description: string;
    href: string;
  }>;

  // Icon mapping for different alert types
  const getAlertIcon = (index: number) => {
    const icons = [
      <PartyPopperIcon
        className="size-5"
        key="party"
      />,
      <SparklesIcon
        className="size-5"
        key="sparkles"
      />,
      <CrownIcon
        className="size-5"
        key="crown"
      />,
    ];
    return (
      icons[index] || (
        <PartyPopperIcon
          className="size-5"
          key="default"
        />
      )
    );
  };

  // Color mapping for different alert types
  const getAlertColor = (index: number) => {
    const colors = ['primary', 'secondary', 'warning'] as const;
    return colors[index] || 'primary';
  };

  return (
    <div className="relative">
      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 5000,
            stopOnInteraction: true,
            stopOnMouseEnter: true,
          }),
        ]}
        className="w-full">
        <CarouselContent>
          {alerts.map((alert, index) => (
            <CarouselItem key={index}>
              <Alert
                as={Link}
                href={alert.href}
                target="_blank"
                variant="flat"
                color={getAlertColor(index)}
                icon={getAlertIcon(index)}
                endContent={
                  <Button
                    variant="flat"
                    color={getAlertColor(index)}
                    as={Link}
                    href={alert.href}
                    target="_blank">
                    <ArrowRightIcon />
                  </Button>
                }
                className="group cursor-pointer transition-all">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{alert.title}</span>
                  <span className="text-sm">{alert.description}</span>
                </div>
              </Alert>
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* <CarouselPrevious className="left-2" /> */}
        {/* <CarouselNext className="right-2" /> */}
      </Carousel>
    </div>
  );
}
