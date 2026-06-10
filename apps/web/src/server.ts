import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

// In the production build this file runs as dist/server/server.js, so the
// client bundle (hashed /assets/* plus copied public/ files) sits in ../client.
const staticRoot = (() => {
  const candidate = resolve(dirname(fileURLToPath(import.meta.url)), '../client');

  return existsSync(candidate) ? candidate : null;
})();

const MIME_TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
};

function tryServeStatic(req: IncomingMessage, res: ServerResponse) {
  if (!staticRoot || (req.method !== 'GET' && req.method !== 'HEAD')) {
    return false;
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://internal').pathname);
  } catch {
    return false;
  }

  if (pathname === '/' || pathname.includes('\0') || pathname.split('/').includes('..')) {
    return false;
  }

  const filePath = resolve(join(staticRoot, pathname));

  if (!filePath.startsWith(staticRoot)) {
    return false;
  }

  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    return false;
  }

  if (!stats.isFile()) {
    return false;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('Content-Length', stats.size);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Vite asset filenames are content-hashed, so /assets/* can cache forever.
  res.setHeader(
    'Cache-Control',
    pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  );

  if (req.method === 'HEAD') {
    res.end();
    return true;
  }

  createReadStream(filePath)
    .on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 500;
      }
      res.end();
    })
    .pipe(res);

  return true;
}

if (isDirectRun()) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  createServer(async (req, res) => {
    try {
      if (tryServeStatic(req, res)) {
        return;
      }

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
