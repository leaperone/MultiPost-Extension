import { decode, encode } from "blurhash"
import { encode as avifEncode } from '@jsquash/avif';

export function blurHashToDataURL(hash: string | undefined): string | undefined {
  if (!hash) return undefined

  const pixels = decode(hash, 32, 32)
  const dataURL = parsePixels(pixels, 32, 32)
  return dataURL
}

// thanks to https://github.com/wheany/js-png-encoder
function parsePixels(pixels: Uint8ClampedArray, width: number, height: number) {
  const pixelsString = [...pixels].map(byte => String.fromCharCode(byte)).join("")
  const pngString = generatePng(width, height, pixelsString)
  const dataURL = typeof Buffer !== "undefined"
    ? Buffer.from(getPngArray(pngString)).toString("base64")
    : btoa(pngString)
  return "data:image/png;base64," + dataURL
}

function getPngArray(pngString: string) {
  const pngArray = new Uint8Array(pngString.length)
  for (let i = 0; i < pngString.length; i++) {
    pngArray[i] = pngString.charCodeAt(i)
  }
  return pngArray
}

function generatePng(width: number, height: number, rgbaString: string) {
  const DEFLATE_METHOD = String.fromCharCode(0x78, 0x01)
  const CRC_TABLE: number[] = []
  const SIGNATURE = String.fromCharCode(137, 80, 78, 71, 13, 10, 26, 10)
  const NO_FILTER = String.fromCharCode(0)

  let n, c, k

  // make crc table
  for (n = 0; n < 256; n++) {
    c = n
    for (k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1)
      } else {
        c = c >>> 1
      }
    }
    CRC_TABLE[n] = c
  }

  // Functions
  function inflateStore(data: string) {
    const MAX_STORE_LENGTH = 65535
    let storeBuffer = ""
    let remaining
    let blockType

    for (let i = 0; i < data.length; i += MAX_STORE_LENGTH) {
      remaining = data.length - i
      blockType = ""

      if (remaining <= MAX_STORE_LENGTH) {
        blockType = String.fromCharCode(0x01)
      } else {
        remaining = MAX_STORE_LENGTH
        blockType = String.fromCharCode(0x00)
      }
      // little-endian
      storeBuffer += blockType + String.fromCharCode((remaining & 0xFF), (remaining & 0xFF00) >>> 8)
      storeBuffer += String.fromCharCode(((~remaining) & 0xFF), ((~remaining) & 0xFF00) >>> 8)

      storeBuffer += data.substring(i, i + remaining)
    }

    return storeBuffer
  }

  function adler32(data: string) {
    const MOD_ADLER = 65521
    let a = 1
    let b = 0

    for (let i = 0; i < data.length; i++) {
      a = (a + data.charCodeAt(i)) % MOD_ADLER
      b = (b + a) % MOD_ADLER
    }

    return (b << 16) | a
  }

  function updateCrc(crc: number, buf: string) {
    let c = crc
    let b: number

    for (let n = 0; n < buf.length; n++) {
      b = buf.charCodeAt(n)
      c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
    }
    return c
  }

  function crc(buf: string) {
    return updateCrc(0xffffffff, buf) ^ 0xffffffff
  }

  function dwordAsString(dword: number) {
    return String.fromCharCode(
      (dword & 0xFF000000) >>> 24, (dword & 0x00FF0000) >>> 16, (dword & 0x0000FF00) >>> 8, (dword & 0x000000FF)
    )
  }

  function createChunk(length: number, type: string, data: string) {
    const CRC = crc(type + data)

    return dwordAsString(length) +
      type +
      data +
      dwordAsString(CRC)
  }

  function createIHDR(width: number, height: number) {
    const IHDRdata =
      dwordAsString(width) +
      dwordAsString(height) +
      // bit depth
      String.fromCharCode(8) +
      // color type: 6=truecolor with alpha
      String.fromCharCode(6) +
      // compression method: 0=deflate, only allowed value
      String.fromCharCode(0) +
      // filtering: 0=adaptive, only allowed value
      String.fromCharCode(0) +
      // interlacing: 0=none
      String.fromCharCode(0)

    return createChunk(13, "IHDR", IHDRdata)
  }

  // PNG creations

  const IEND = createChunk(0, "IEND", "")
  const IHDR = createIHDR(width, height)

  let scanlines = ""
  let scanline

  for (let y = 0; y < rgbaString.length; y += width * 4) {
    scanline = NO_FILTER
    if (Array.isArray(rgbaString)) {
      for (let x = 0; x < width * 4; x++) {
        scanline += String.fromCharCode(rgbaString[y + x] & 0xff)
      }
    } else {
      scanline += rgbaString.substr(y, width * 4)
    }
    scanlines += scanline
  }

  const compressedScanlines = DEFLATE_METHOD + inflateStore(scanlines) + dwordAsString(adler32(scanlines))
  const IDAT = createChunk(compressedScanlines.length, "IDAT", compressedScanlines)

  const pngString = SIGNATURE + IHDR + IDAT + IEND
  return pngString
}

export const getBlurhash = async (file: File) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;

    return new Promise<string>((resolve, reject) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法获取 canvas 上下文'));
            return;
          }

          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const { data, width, height } = imageData;

          const blurhashString = encode(data, width, height, 3, 3);
          resolve(blurhashString);
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图像加载失败'));
      };
    });
  } catch (error) {
    throw new Error('文件读取失败');
  }
};

export const getThumbnail = async (file: File) => {
  const blurhash = await getBlurhash(file);
  return blurHashToDataURL(blurhash);
};

export const convertToAvif = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  try {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

    canvas.width = img.width;
    canvas.height = img.height;
    if (!ctx) throw new Error('无法获取 canvas 上下文');
    ctx.drawImage(img, 0, 0);

    // 使用 @jsquash/avif 进行编码
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const avifBuffer = await avifEncode(imageData, {
      cqLevel: 33, // 质量级别 (0-63)，越低质量越好
      denoiseLevel: 0, // 降噪级别 (0-50)
      cqAlphaLevel: -1, // Alpha 通道质量
      tileRowsLog2: 0, // 行分块
      tileColsLog2: 0, // 列分块
      speed: 8, // 编码速度 (0-10)，越大越快
      subsample: 1, // 色度子采样
      chromaDeltaQ: false, // 启用色度增量量化
      sharpness: 0, // 锐化级别 (0-7)
      tune: 0, // AVIFTune.auto
    });

    // 创建新文件
    const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.avif';
    const newFile = new File([avifBuffer], newFileName, { type: 'image/avif' });

    URL.revokeObjectURL(img.src);
    return newFile;
  } catch (error) {
    console.error('AVIF 转换失败，使用原始文件:', error);
    return file;
  }
};
