import assert from 'node:assert/strict';

process.env.BITIFUL_OSS_ENDPOINT = 'https://s3.bitiful.net';
process.env.BITIFUL_OSS_ACCESS_KEY = 'test-access-key';
process.env.BITIFUL_OSS_SECRET_KEY = 'test-secret-key';
process.env.BITIFUL_OSS_BUCKET = 'multipost';
process.env.BITIFUL_OSS_CDN_URL = 'https://multipost-s3.2some.ren';

const { cdnUrl, getPresignedDownloadUrl, getPresignedUploadUrl } = await import('../src/lib/bitiful');

const uploadUrl = new URL(await getPresignedUploadUrl('filehosting/upload-test'));
assert.equal(uploadUrl.hostname, 'multipost.s3.bitiful.net');
assert.equal(uploadUrl.searchParams.get('X-Amz-SignedHeaders'), 'host');

const downloadUrl = new URL(await getPresignedDownloadUrl('filehosting/download-test'));
assert.equal(downloadUrl.hostname, 'multipost.s3.bitiful.net');
assert.equal(downloadUrl.searchParams.get('X-Amz-SignedHeaders'), 'host');

const previewUrl = new URL(cdnUrl('https://multipost.s3.bitiful.net/filehosting/preview-test'));
assert.equal(previewUrl.hostname, 'multipost-s3.2some.ren');

console.log('Bitiful presigned URLs preserve the origin host; unsigned previews use the CDN host.');
