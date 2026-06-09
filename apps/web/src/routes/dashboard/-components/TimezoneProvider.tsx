import { useEffect } from 'react';

export function TimezoneProvider() {
  useEffect(() => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const currentTimezone = document.cookie
        .split('; ')
        .find((row) => row.startsWith('timezone='))
        ?.split('=')[1];

      if (timezone !== currentTimezone) {
        document.cookie = `timezone=${timezone}; path=/; max-age=31536000`;
      }
    } catch {
      document.cookie = 'timezone=Asia/Shanghai; path=/; max-age=31536000';
    }
  }, []);

  return null;
}
