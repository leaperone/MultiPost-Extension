import type { ContentType } from './desktop-bridge';

export const contentTypeLabels: Record<ContentType, string> = {
  DYNAMIC: 'Dynamic',
  VIDEO: 'Video',
  ARTICLE: 'Article',
  PODCAST: 'Podcast',
};

export const publishPathByContentType: Record<ContentType, string> = {
  DYNAMIC: '/dashboard/desktop/publish/dynamic',
  VIDEO: '/dashboard/desktop/publish/video',
  ARTICLE: '/dashboard/desktop/publish/article',
  PODCAST: '/dashboard/desktop/publish/dynamic',
};

export function isKnownContentType(value: unknown): value is ContentType {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(contentTypeLabels, value)
  );
}

export function getContentTypeLabel(value: unknown) {
  return isKnownContentType(value) ? contentTypeLabels[value] : 'Unknown';
}

export function getPublishPathForContentType(value: unknown) {
  return isKnownContentType(value) ? publishPathByContentType[value] : null;
}
