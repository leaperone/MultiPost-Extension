/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const tar = require('tar');

if (process.env.VERCEL) {
  console.log('Vercel environment detected. Skipping geo setup.');
  process.exit(0);
}

const db = 'GeoLite2-City';
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 seconds

let url = `https://raw.githubusercontent.com/GitSquared/node-geolite2-redist/master/redist/${db}.tar.gz`;

if (process.env.MAXMIND_LICENSE_KEY) {
  url =
    `https://download.maxmind.com/app/geoip_download` +
    `?edition_id=${db}&license_key=${process.env.MAXMIND_LICENSE_KEY}&suffix=tar.gz`;
}

const dest = path.resolve(__dirname, '../geo');

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const download = (url, retryCount = 0) =>
  new Promise((resolve, reject) => {
    console.log(`Attempting download (attempt ${retryCount + 1}/${MAX_RETRIES})...`);

    const request = https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(res.pipe(zlib.createGunzip({})).pipe(tar.t()));
      } else {
        const error = new Error(`Failed to download: ${res.statusCode} ${res.statusMessage}`);
        reject(error);
      }
    });

    request.on('error', async (error) => {
      console.error(`Download failed:`, error.message);

      if (retryCount < MAX_RETRIES - 1) {
        console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await sleep(RETRY_DELAY);
        try {
          const result = await download(url, retryCount + 1);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      } else {
        console.error('Max retries reached. Download failed.');
        reject(error);
      }
    });

    request.setTimeout(30000, () => {
      request.destroy(new Error('Request timeout'));
    });
  });

async function main() {
  try {
    const res = await download(url);

    await new Promise((resolve, reject) => {
      res.on('entry', (entry) => {
        if (entry.path.endsWith('.mmdb')) {
          const filename = path.join(dest, path.basename(entry.path));
          entry.pipe(fs.createWriteStream(filename));
          console.log('Saved geo database:', filename);
        }
      });

      res.on('error', reject);
      res.on('finish', resolve);
    });

    console.log('Download completed successfully!');
  } catch (error) {
    console.error('Failed to download geo database:', error.message);
    process.exit(1);
  }
}

main();
