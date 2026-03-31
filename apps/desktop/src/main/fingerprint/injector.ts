/**
 * Generate fingerprint injection script
 * This script is injected into pages via CDP to override browser fingerprint
 */

import type { FingerprintProfile } from '../../shared/types/fingerprint'

/**
 * Generate JavaScript code to inject fingerprint overrides
 */
export function generateInjectionScript(profile: FingerprintProfile): string {
  const config = JSON.stringify({
    navigator: profile.navigator,
    screen: profile.screen,
    webgl: profile.webgl,
    canvas: profile.canvas,
    audio: profile.audio,
    fonts: profile.fonts
  })

  return `
(function() {
  'use strict';

  const config = ${config};

  // Store original functions for later use
  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
  const originalGetFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;

  // ========== Navigator Overrides ==========

  const navigatorProps = {
    userAgent: { value: config.navigator.userAgent },
    platform: { value: config.navigator.platform },
    language: { value: config.navigator.language },
    languages: { value: Object.freeze(config.navigator.languages) },
    hardwareConcurrency: { value: config.navigator.hardwareConcurrency },
    deviceMemory: { value: config.navigator.deviceMemory },
    maxTouchPoints: { value: config.navigator.maxTouchPoints },
    vendor: { value: config.navigator.vendor },
    doNotTrack: { value: config.navigator.doNotTrack }
  };

  for (const [prop, descriptor] of Object.entries(navigatorProps)) {
    try {
      Object.defineProperty(Navigator.prototype, prop, {
        get: function() { return descriptor.value; },
        configurable: true
      });
    } catch (e) {}
  }

  // ========== Screen Overrides ==========

  const screenProps = {
    width: config.screen.width,
    height: config.screen.height,
    availWidth: config.screen.availWidth,
    availHeight: config.screen.availHeight,
    colorDepth: config.screen.colorDepth,
    pixelDepth: config.screen.pixelDepth
  };

  for (const [prop, value] of Object.entries(screenProps)) {
    try {
      Object.defineProperty(Screen.prototype, prop, {
        get: function() { return value; },
        configurable: true
      });
    } catch (e) {}
  }

  // Device pixel ratio
  try {
    Object.defineProperty(window, 'devicePixelRatio', {
      get: function() { return config.screen.devicePixelRatio; },
      configurable: true
    });
  } catch (e) {}

  // ========== WebGL Overrides ==========

  const WEBGL_VENDOR = 0x1F00;
  const WEBGL_RENDERER = 0x1F01;
  const UNMASKED_VENDOR_WEBGL = 0x9245;
  const UNMASKED_RENDERER_WEBGL = 0x9246;

  function spoofWebGLParameter(target) {
    return function(param) {
      switch (param) {
        case WEBGL_VENDOR:
          return config.webgl.vendor;
        case WEBGL_RENDERER:
          return config.webgl.renderer;
        case UNMASKED_VENDOR_WEBGL:
          return config.webgl.unmaskedVendor;
        case UNMASKED_RENDERER_WEBGL:
          return config.webgl.unmaskedRenderer;
        default:
          return target.call(this, param);
      }
    };
  }

  WebGLRenderingContext.prototype.getParameter = spoofWebGLParameter(originalGetParameter);
  WebGL2RenderingContext.prototype.getParameter = spoofWebGLParameter(originalGetParameter2);

  // ========== Canvas Fingerprint Noise ==========

  // Seeded random for consistent noise
  function seededRandom(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const canvasRandom = seededRandom(config.canvas.seed);

  function addCanvasNoise(imageData) {
    const data = imageData.data;
    const noise = config.canvas.noise;
    for (let i = 0; i < data.length; i += 4) {
      // Add tiny noise to RGB channels (not alpha)
      const r = canvasRandom();
      if (r < noise) {
        data[i] = Math.min(255, Math.max(0, data[i] + (canvasRandom() > 0.5 ? 1 : -1)));
      }
    }
    return imageData;
  }

  // Override getImageData
  CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
    const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
    return addCanvasNoise(imageData);
  };

  // Override toDataURL
  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    const ctx = this.getContext('2d');
    if (ctx) {
      try {
        const imageData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
        addCanvasNoise(imageData);
        ctx.putImageData(imageData, 0, 0);
      } catch (e) {
        // Canvas may be tainted, skip noise
      }
    }
    return originalToDataURL.call(this, type, quality);
  };

  // Override toBlob
  HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
    const ctx = this.getContext('2d');
    if (ctx) {
      try {
        const imageData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
        addCanvasNoise(imageData);
        ctx.putImageData(imageData, 0, 0);
      } catch (e) {}
    }
    return originalToBlob.call(this, callback, type, quality);
  };

  // ========== Audio Fingerprint Noise ==========

  const audioRandom = seededRandom(config.audio.seed);

  AnalyserNode.prototype.getFloatFrequencyData = function(array) {
    originalGetFloatFrequencyData.call(this, array);
    const noise = config.audio.noise;
    for (let i = 0; i < array.length; i++) {
      if (audioRandom() < noise * 10) {
        array[i] += (audioRandom() - 0.5) * 0.0001;
      }
    }
  };

  // ========== Remove webdriver flag ==========

  try {
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: function() { return undefined; },
      configurable: true
    });
    delete navigator.webdriver;
  } catch (e) {}

  // ========== Plugin/MimeType Spoofing ==========

  try {
    Object.defineProperty(Navigator.prototype, 'plugins', {
      get: function() {
        return {
          length: 5,
          item: function() { return null; },
          namedItem: function() { return null; },
          refresh: function() {}
        };
      },
      configurable: true
    });

    Object.defineProperty(Navigator.prototype, 'mimeTypes', {
      get: function() {
        return {
          length: 4,
          item: function() { return null; },
          namedItem: function() { return null; }
        };
      },
      configurable: true
    });
  } catch (e) {}

  // ========== Prevent detection of overrides ==========

  // Make toString return native code
  const nativeToString = function() {
    return 'function ' + this.name + '() { [native code] }';
  };

  const functionsToSpoof = [
    WebGLRenderingContext.prototype.getParameter,
    WebGL2RenderingContext.prototype.getParameter,
    HTMLCanvasElement.prototype.toDataURL,
    HTMLCanvasElement.prototype.toBlob,
    CanvasRenderingContext2D.prototype.getImageData,
    AnalyserNode.prototype.getFloatFrequencyData
  ];

  for (const fn of functionsToSpoof) {
    try {
      fn.toString = nativeToString;
    } catch (e) {}
  }

})();
`.trim()
}
