import { S3Client } from '@aws-sdk/client-s3';
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { Hash } from '@smithy/hash-node';
import { HeadObjectCommand, type HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import { formatUrl } from '@aws-sdk/util-format-url';
import { HttpRequest } from '@smithy/protocol-http';
import { parseUrl } from '@smithy/url-parser';

// 常量配置
const OSS_CONFIG = {
  REGION: 'cn-east-1',
  ENDPOINT: process.env.BITIFUL_OSS_ENDPOINT || 'placeholder',
  ACCESS_KEY: process.env.BITIFUL_OSS_ACCESS_KEY || 'placeholder',
  SECRET_KEY: process.env.BITIFUL_OSS_SECRET_KEY || 'placeholder',
} as const;

// 共用的凭证配置
const credentials = {
  accessKeyId: OSS_CONFIG.ACCESS_KEY,
  secretAccessKey: OSS_CONFIG.SECRET_KEY,
} as const;

// 基础客户端配置
const baseConfig = {
  region: OSS_CONFIG.REGION,
  endpoint: OSS_CONFIG.ENDPOINT,
  credentials,
} as const;

const bucket = process.env.BITIFUL_OSS_BUCKET || 'placeholder';

export const s3Client = new S3Client(baseConfig);

export const s3Presigner = new S3RequestPresigner({
  ...baseConfig,
  sha256: Hash.bind(null, 'sha256'),
});

export function getCustomQuery(maxRequests?: number, fmt?: string, quality?: string): { [key: string]: string } {
  const customQuery: { [key: string]: string } = {
    'x-bitiful-max-requests': maxRequests ? maxRequests.toString() : '1',
  };

  if (fmt) {
    customQuery['fmt'] = fmt;
  }
  if (quality) {
    customQuery['q'] = quality;
  }

  return customQuery;
}

export function getEndPoint(): string {
  const endpoint = process.env.BITIFUL_OSS_ENDPOINT?.replace(/^https?:\/\//, '');
  return `https://${bucket}.${endpoint}`;
}

function cdnUrl(url: string): string {
  if (process.env.BITIFUL_OSS_CDN_URL) {
    return url.replace(getEndPoint(), process.env.BITIFUL_OSS_CDN_URL);
  }
  return url;
}

export async function getPresignedUploadUrl(key: string, expiresIn: number = 15 * 60): Promise<string> {
  const objectUrl = parseUrl(getEndPoint() + '/' + key);

  const request = new HttpRequest({
    ...objectUrl,
    method: 'PUT',
  });

  return cdnUrl(formatUrl(await s3Presigner.presign(request, { expiresIn })));
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 15 * 60,
  customQuery: { [key: string]: string } = { 'x-bitiful-max-requests': '1' },
): Promise<string> {
  const objectUrl = parseUrl(getEndPoint() + '/' + key);

  if (objectUrl.query) {
    for (const [key, value] of Object.entries(customQuery)) {
      objectUrl.query[key] = value;
    }
  } else {
    objectUrl.query = customQuery;
  }

  return cdnUrl(formatUrl(await s3Presigner.presign(new HttpRequest(objectUrl), { expiresIn })));
}

export async function headObject(key: string): Promise<HeadObjectCommandOutput> {
  return s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}
