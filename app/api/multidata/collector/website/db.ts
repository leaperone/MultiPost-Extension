/* eslint-disable @typescript-eslint/no-explicit-any */
import { EVENT_TYPE } from '@/lib/constants';
import { multipostDb } from '@/lib/db';
import { Website, WebsiteEvent, VisitorSession, SessionData } from '@/prisma/client_multipost';

export async function fetchWebsite(websiteId: string): Promise<Website | null> {
  return await multipostDb.website.findUnique({
    where: {
      id: websiteId,
      deletedAt: null,
    },
  });
}

export async function fetchSession(websiteId: string, sessionId: string): Promise<VisitorSession | null> {
  return await multipostDb.visitorSession.findUnique({
    where: {
      id: sessionId,
      websiteId,
    },
  });
}

export async function createSession(data: {
  id: string;
  websiteId: string;
  hostname?: string;
  browser?: string;
  os?: string;
  device?: string;
  screen?: string;
  language?: string;
  country?: string;
  subdivision1?: string;
  subdivision2?: string;
  city?: string;
  ip?: string;
}): Promise<VisitorSession> {
  return await multipostDb.visitorSession.create({
    data,
  });
}

export async function saveEvent(data: {
  websiteId: string;
  sessionId: string;
  visitId: string;
  urlPath: string;
  urlQuery?: string;
  referrerPath?: string;
  referrerQuery?: string;
  referrerDomain?: string;
  pageTitle?: string;
  eventName?: string;
  eventData?: Record<string, any>;
  hostname?: string;
  browser?: string;
  os?: string;
  device?: string;
  screen?: string;
  language?: string;
  country?: string;
  subdivision1?: string;
  subdivision2?: string;
  city?: string;
  tag?: string;
  createdAt: Date;
}): Promise<WebsiteEvent> {
  const event = await multipostDb.websiteEvent.create({
    data: {
      websiteId: data.websiteId,
      sessionId: data.sessionId,
      visitId: data.visitId,
      urlPath: data.urlPath,
      urlQuery: data.urlQuery,
      referrerPath: data.referrerPath,
      referrerQuery: data.referrerQuery,
      referrerDomain: data.referrerDomain,
      pageTitle: data.pageTitle,
      eventName: data.eventName,
      eventType: data.eventName ? EVENT_TYPE.customEvent : EVENT_TYPE.pageView,
      tag: data.tag,
      createdAt: data.createdAt,
    },
  });

  if (data.eventData) {
    const eventDataEntries = Object.entries(data.eventData).map(([key, value]) => ({
      websiteId: data.websiteId,
      websiteEventId: event.id,
      dataKey: key,
      stringValue: typeof value === 'string' ? value : null,
      numberValue: typeof value === 'number' ? value : null,
      dateValue: value instanceof Date ? value : null,
      dataType: typeof value === 'string' ? 1 : typeof value === 'number' ? 2 : 3,
    }));

    await multipostDb.eventData.createMany({
      data: eventDataEntries,
    });
  }

  return event;
}

export async function saveSessionData(data: {
  websiteId: string;
  sessionId: string;
  sessionData: Record<string, any>;
  createdAt: Date;
}): Promise<SessionData[]> {
  const sessionDataEntries = Object.entries(data.sessionData).map(([key, value]) => ({
    websiteId: data.websiteId,
    sessionId: data.sessionId,
    dataKey: key,
    stringValue: typeof value === 'string' ? value : null,
    numberValue: typeof value === 'number' ? value : null,
    dateValue: value instanceof Date ? value : null,
    dataType: typeof value === 'string' ? 1 : typeof value === 'number' ? 2 : 3,
    createdAt: data.createdAt,
  }));

  return await multipostDb.$transaction(
    sessionDataEntries.map((entry) =>
      multipostDb.sessionData.create({
        data: entry,
      }),
    ),
  );
}
