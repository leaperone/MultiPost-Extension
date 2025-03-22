'use client';

import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import React, { ComponentPropsWithoutRef, useEffect, useMemo, useState } from 'react';

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations = {
    initial: { scale: 0.8, opacity: 0, y: -20 },
    animate: { scale: 1, opacity: 1, y: 0 },
    exit: { scale: 0.8, opacity: 0, y: 20 },
    transition: { type: 'spring', stiffness: 350, damping: 25 },
  };

  return (
    <motion.div
      {...animations}
      layout
      className="mx-auto w-full">
      {children}
    </motion.div>
  );
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<'div'> {
  children: React.ReactNode;
  delay?: number;
  loop?: boolean;
  maxVisible?: number;
}

export const AnimatedList = React.memo(
  ({ children, className, delay = 1000, loop = false, maxVisible = 3, ...props }: AnimatedListProps) => {
    const [visibleItems, setVisibleItems] = useState<number[]>([]);
    const childrenArray = useMemo(() => React.Children.toArray(children), [children]);
    const totalItems = childrenArray.length;

    useEffect(() => {
      const interval = setInterval(() => {
        setVisibleItems((prev) => {
          // 如果没有显示项，从第一个开始
          if (prev.length === 0) {
            return [0];
          }

          // 获取最新的一个项的索引
          const lastIndex = prev[prev.length - 1];
          const nextIndex = (lastIndex + 1) % totalItems;

          // 如果达到最大显示数量，移除最早的一个
          const newItems = prev.length >= maxVisible ? prev.slice(1) : prev;

          // 在循环模式下继续添加，否则只在未到达末尾时添加
          if (loop || nextIndex > lastIndex) {
            return [...newItems, nextIndex];
          }

          return prev;
        });
      }, delay);

      return () => clearInterval(interval);
    }, [delay, totalItems, loop, maxVisible]);

    const itemsToShow = useMemo(() => {
      return visibleItems.map((index) => childrenArray[index]);
    }, [visibleItems, childrenArray]);

    return (
      <div
        className={cn(`flex flex-col items-center gap-4`, className)}
        {...props}>
        <AnimatePresence>
          {itemsToShow.map((item, i) => (
            <AnimatedListItem key={`${(item as React.ReactElement).key}-${visibleItems[i]}`}>{item}</AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    );
  },
);

AnimatedList.displayName = 'AnimatedList';
