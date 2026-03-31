'use client';

import { motion } from 'framer-motion';
import { CalendarDaysIcon, PlusIcon } from 'lucide-react';
import NextLink from 'next/link';

import ScheduleCalendar from './ScheduleCalendar';
import StatusLegend from './StatusLegend';
import { Button, Card } from '@heroui/react';

interface SchedulePageClientProps {
  title: string;
  description: string;
  createScheduleLabel: string;
}

export default function SchedulePageClient({ title, description, createScheduleLabel }: SchedulePageClientProps) {
  return (
    <div className="min-h-screen bg-background h-screen overflow-y-auto">
      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-6 sm:px-8 lg:px-10">
        {/* Header Section */}
        <motion.div
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Title & Description */}
            <div>
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="size-6 text-blue-500" />
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">{description}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusLegend />
              <NextLink href="/dashboard/publish">
                <Button color="primary">
                  <PlusIcon className="mr-2 size-4" />
                  {createScheduleLabel}
                </Button>
              </NextLink>
            </div>
          </div>
        </motion.div>

        {/* Calendar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="shadow-none border p-4 sm:p-6">
            <ScheduleCalendar />
          </Card>
        </motion.div>

        {/* Bottom Spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
