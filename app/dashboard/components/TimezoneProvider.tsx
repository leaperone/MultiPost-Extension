'use client';

import { useEffect } from 'react';

export function TimezoneProvider() {
  useEffect(() => {
    try {
      // 获取客户端时区
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const currentTimezone = document.cookie
        .split('; ')
        .find((row) => row.startsWith('timezone='))
        ?.split('=')[1];

      // 如果时区发生变化或者没有时区信息，则更新
      if (timezone !== currentTimezone) {
        document.cookie = `timezone=${timezone}; path=/; max-age=31536000`; // 一年有效期
      }
    } catch (error) {
      document.cookie = `timezone=Asia/Shanghai; path=/; max-age=31536000`; // 一年有效期
    }
  }, []); // 每次组件挂载时都会执行

  return null;
}
