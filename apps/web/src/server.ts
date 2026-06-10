import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';

import type { IncomingMessage, ServerResponse } from 'node:http';
import * as Sentry from '@sentry/node-core';

import { initSentryServer } from './sentry.server.config';

initSentryServer();

const fetch = createStartHandler(defaultStreamHandler);

const serverEntry = {
  fetch,
};

const documentSecurityHeaders = {
  'Content-Security-Policy': 'frame-src *.cloudflare.com seede.ai',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
} as const;

export default serverEntry;

if (isDirectRun()) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  createServer(async (req, res) => {
    try {
      const webRequest = toWebRequest(req, port);
      const webResponse = await serverEntry.fetch(webRequest);

      await sendWebResponse(res, webResponse);
    } catch (error) {
      Sentry.captureException(error);
      console.error(error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('content-type', 'text/plain; charset=utf-8');
      }
      res.end('Internal Server Error');
    }
  }).listen(port, host, () => {
    console.log(`TanStack Start server listening on http://${host}:${port}`);
  });
}

function isDirectRun() {
  const entry = process.argv[1];

  return entry ? import.meta.url === pathToFileURL(entry).href : false;
}

function toWebRequest(req: IncomingMessage, port: number) {
  const forwardedProto = getHeader(req, 'x-forwarded-proto');
  const forwardedHost = getHeader(req, 'x-forwarded-host');
  const host = forwardedHost ?? getHeader(req, 'host') ?? `localhost:${port}`;
  const protocol = forwardedProto ?? 'http';
  const url = new URL(req.url ?? '/', `${protocol}://${host}`);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = Readable.toWeb(req) as ReadableStream;
    init.duplex = 'half';
  }

  return new Request(url, init);
}

async function sendWebResponse(res: ServerResponse, webResponse: Response) {
  res.statusCode = webResponse.status;
  res.statusMessage = webResponse.statusText;

  const setCookies = getSetCookies(webResponse.headers);

  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      res.setHeader(key, value);
    }
  });

  if (setCookies.length) {
    res.setHeader('set-cookie', setCookies);
  }

  setDocumentSecurityHeaders(res, webResponse);

  if (!webResponse.body) {
    res.end();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(webResponse.body as unknown as Parameters<typeof Readable.fromWeb>[0])
      .on('error', reject)
      .on('end', resolve)
      .pipe(res);
  });
}

function getHeader(req: IncomingMessage, name: string) {
  const value = req.headers[name];

  return Array.isArray(value) ? value[0] : value;
}

function getSetCookies(headers: Headers) {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => Array<string> };

  if (typeof withGetSetCookie.getSetCookie === 'function') {
    return withGetSetCookie.getSetCookie();
  }

  const cookie = headers.get('set-cookie');

  return cookie ? [cookie] : [];
}

function setDocumentSecurityHeaders(res: ServerResponse, webResponse: Response) {
  if (!isHtmlResponse(webResponse)) return;

  for (const [key, value] of Object.entries(documentSecurityHeaders)) {
    if (!res.hasHeader(key)) {
      res.setHeader(key, value);
    }
  }
}

function isHtmlResponse(webResponse: Response) {
  return webResponse.headers.get('content-type')?.toLowerCase().includes('text/html') ?? false;
}
