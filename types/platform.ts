import type { SyncData } from './sync';

export interface PlatformInfo {
  type: 'DYNAMIC' | 'VIDEO';
  name: string;
  homeUrl: string;
  faviconUrl?: string;
  platformName: string;
  username?: string;
  userAvatarUrl?: string;
  injectUrl: string;
  injectFunction: (data: SyncData) => Promise<void>;
}
