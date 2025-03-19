import path from 'path';
import { browserName, detectOS, Browser } from 'detect-browser';
import isLocalhost from 'is-localhost-ip';
import ipaddr from 'ipaddr.js';
import maxmind, { CityResponse, Reader } from 'maxmind';
import {
  DESKTOP_OS,
  MOBILE_OS,
  DESKTOP_SCREEN_WIDTH,
  LAPTOP_SCREEN_WIDTH,
  MOBILE_SCREEN_WIDTH,
  IP_ADDRESS_HEADERS,
} from './constants';

declare global {
  // eslint-disable-next-line no-var
  var maxmind: Reader<CityResponse>;
}

// const MAXMIND = 'maxmind';

export function getIpAddress(headers: Headers): string | undefined {
  const customHeader = process.env.CLIENT_IP_HEADER;

  if (customHeader && headers.get(customHeader)) {
    return headers.get(customHeader) || undefined;
  }

  const header = IP_ADDRESS_HEADERS.find((name) => {
    return headers.get(name);
  });

  if (!header) return undefined;

  const ip = headers.get(header);

  if (!ip) return undefined;

  if (header === 'x-forwarded-for') {
    return ip.split(',')?.[0]?.trim();
  }

  if (header === 'forwarded') {
    const match = ip.match(/for=(\[?[0-9a-fA-F:.]+\]?)/);

    if (match) {
      return match[1];
    }
  }

  return ip;
}

export function getDevice(screen: string | undefined, os: string | null): string | undefined {
  if (!screen || !os) return undefined;

  const [width] = screen.split('x');

  if (DESKTOP_OS.includes(os)) {
    if (os === 'Chrome OS' || +width < DESKTOP_SCREEN_WIDTH) {
      return 'laptop';
    }
    return 'desktop';
  } else if (MOBILE_OS.includes(os)) {
    if (os === 'Amazon OS' || +width > MOBILE_SCREEN_WIDTH) {
      return 'tablet';
    }
    return 'mobile';
  }

  if (+width >= DESKTOP_SCREEN_WIDTH) {
    return 'desktop';
  } else if (+width >= LAPTOP_SCREEN_WIDTH) {
    return 'laptop';
  } else if (+width >= MOBILE_SCREEN_WIDTH) {
    return 'tablet';
  } else {
    return 'mobile';
  }
}

function getRegionCode(country: string | null | undefined, region: string | null | undefined): string | undefined {
  if (!country || !region) {
    return undefined;
  }

  return region.includes('-') ? region : `${country}-${region}`;
}

function decodeHeader(s: string | undefined | null): string | undefined | null {
  if (s === undefined || s === null) {
    return s;
  }

  return Buffer.from(s, 'latin1').toString('utf-8');
}

interface Location {
  country?: string | null;
  subdivision1?: string | null;
  subdivision2?: string | null;
  city?: string | null;
}

export async function getLocation(
  ip: string = '',
  headers: Headers,
  hasPayloadIP: boolean,
): Promise<Location | undefined> {
  // Ignore local ips
  if (await isLocalhost(ip)) {
    return undefined;
  }

  if (!hasPayloadIP && !process.env.SKIP_LOCATION_HEADERS) {
    // Cloudflare headers
    if (headers.get('cf-ipcountry')) {
      const country = decodeHeader(headers.get('cf-ipcountry'));
      const subdivision1 = decodeHeader(headers.get('cf-region-code'));
      const city = decodeHeader(headers.get('cf-ipcity'));

      return {
        country,
        subdivision1: country && subdivision1 ? getRegionCode(country, subdivision1) : undefined,
        city,
      };
    }

    // Vercel headers
    if (headers.get('x-vercel-ip-country')) {
      const country = decodeHeader(headers.get('x-vercel-ip-country'));
      const subdivision1 = decodeHeader(headers.get('x-vercel-ip-country-region'));
      const city = decodeHeader(headers.get('x-vercel-ip-city'));

      return {
        country,
        subdivision1: country && subdivision1 ? getRegionCode(country, subdivision1) : undefined,
        city,
      };
    }
  }

  // Database lookup
  if (!global.maxmind) {
    const dir = path.join(process.cwd(), 'geo');
    global.maxmind = await maxmind.open(path.resolve(dir, 'GeoLite2-City.mmdb'));
  }

  const result = global.maxmind.get(ip);

  if (result) {
    const country = result.country?.iso_code ?? result?.registered_country?.iso_code;
    const subdivision1 = result.subdivisions?.[0]?.iso_code;
    const subdivision2 = result.subdivisions?.[1]?.names?.en;
    const city = result.city?.names?.en;

    return {
      country,
      subdivision1: country && subdivision1 ? getRegionCode(country, subdivision1) : undefined,
      subdivision2,
      city,
    };
  }
}

interface ClientPayload {
  userAgent?: string;
  ip?: string;
  screen?: string;
}

interface ClientInfo {
  userAgent: string | null;
  browser: Browser | null;
  os: string;
  ip: string | undefined;
  country: string | null | undefined;
  subdivision1: string | null | undefined;
  subdivision2: string | null | undefined;
  city: string | null | undefined;
  device: string | undefined;
}

export async function getClientInfo(request: Request, payload: ClientPayload): Promise<ClientInfo> {
  const userAgent = payload?.userAgent || request.headers.get('user-agent');
  const ip = payload?.ip || getIpAddress(request.headers);
  const location = await getLocation(ip, request.headers, !!payload?.ip);
  const country = location?.country;
  const subdivision1 = location?.subdivision1;
  const subdivision2 = location?.subdivision2;
  const city = location?.city;
  const browser = browserName(userAgent || '') || null;
  const os = detectOS(userAgent || '') || 'unknown';
  const device = getDevice(payload?.screen, os);

  return { userAgent, browser, os, ip, country, subdivision1, subdivision2, city, device };
}

export function hasBlockedIp(clientIp: string): boolean {
  const ignoreIps = process.env.IGNORE_IP;

  if (ignoreIps) {
    const ips = [];

    if (ignoreIps) {
      ips.push(...ignoreIps.split(',').map((n) => n.trim()));
    }

    return ips.some((ip) => {
      if (ip === clientIp) {
        return true;
      }

      // CIDR notation
      if (ip.indexOf('/') > 0) {
        const addr = ipaddr.parse(clientIp);
        const range = ipaddr.parseCIDR(ip);

        if (addr.kind() === range[0].kind() && addr.match(range)) {
          return true;
        }
      }
      return false;
    });
  }

  return false;
}
