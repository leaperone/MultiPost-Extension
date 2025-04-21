import type { PlatformInfo } from './common';
import { PodcastQQMusic } from './podcast/qqmusic';
import { PodcastLiZhi } from './podcast/lizhi';

export const PodcastInfoMap: Record<string, PlatformInfo> = {
  PODCAST_QQMUSIC: {
    type: 'PODCAST',
    name: 'PODCAST_QQMUSIC',
    homeUrl: 'https://mp.tencentmusic.com/index',
    faviconUrl: 'https://mp.tencentmusic.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformQQMusic'),
    injectUrl: 'https://mp.tencentmusic.com/index',
    injectFunction: PodcastQQMusic,
    tags: ['CN'],
    accountKey: 'qqmusic',
  },
  PODCAST_LIZHI: {
    type: 'PODCAST',
    name: 'PODCAST_LIZHI',
    homeUrl: 'https://nj.lizhi.fm/static/newsite/#/index',
    faviconUrl: 'https://nj.lizhi.fm/static/newsite/logo240.png',
    platformName: chrome.i18n.getMessage('platformLizhi'),
    injectUrl: 'https://nj.lizhi.fm/static/newsite/#/index',
    injectFunction: PodcastLiZhi,
    tags: ['CN'],
    accountKey: 'lizhi',
  },
};
