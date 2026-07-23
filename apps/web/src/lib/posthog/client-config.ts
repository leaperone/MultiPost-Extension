function readClientEnv(name: string) {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export const POSTHOG_KEY = readClientEnv('NEXT_PUBLIC_POSTHOG_KEY');
export const POSTHOG_HOST = readClientEnv('NEXT_PUBLIC_POSTHOG_HOST') || 'https://t.multipost.app';
export const POSTHOG_DISABLED = readClientEnv('NEXT_PUBLIC_POSTHOG_DISABLED') === '1';

export function isPostHogClientEnabled() {
  return import.meta.env.PROD && !POSTHOG_DISABLED && Boolean(POSTHOG_KEY && POSTHOG_HOST);
}
