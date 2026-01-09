'use client';

import { motion } from 'framer-motion';
import { CalendarDaysIcon, PlusIcon } from 'lucide-react';
import NextLink from 'next/link';

import ScheduleCalendar from './ScheduleCalendar';
import StatusLegend from './StatusLegend';
import { LiquidGlassButton } from '@/components/ui/liquid-glass';

interface SchedulePageClientProps {
  title: string;
  description: string;
  createScheduleLabel: string;
}

export default function SchedulePageClient({ title, description, createScheduleLabel }: SchedulePageClientProps) {
  return (
    <div className="relative h-full overflow-y-auto">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />

      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm dark:bg-black/40" />

      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-32 -top-32 size-96 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/10"
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 size-96 rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-600/10"
          animate={{
            x: [0, -30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
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
                <h1 className="text-2xl font-bold text-foreground/90 sm:text-3xl">{title}</h1>
              </div>
              <p className="mt-1 text-sm text-foreground/50 sm:text-base">{description}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusLegend />
              <NextLink href="/dashboard/publish">
                <LiquidGlassButton variant="primary" className="flex items-center gap-2">
                  <PlusIcon className="size-4" />
                  <span>{createScheduleLabel}</span>
                </LiquidGlassButton>
              </NextLink>
            </div>
          </div>
        </motion.div>

        {/* Calendar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}>
          <ScheduleCalendar />
        </motion.div>

        {/* Bottom Spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
