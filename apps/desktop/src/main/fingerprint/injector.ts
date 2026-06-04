/**
 * Generate fingerprint injection script
 * This script is injected into pages via CDP to override browser fingerprint
 */

import type { FingerprintProfile, WebGLConfig } from '../../shared/types/fingerprint'
import type { UserAgentDataProfile } from '../browser/sessionHardening'

export interface RuntimeNavigatorConfig {
  userAgent: string
  platform: FingerprintProfile['navigator']['platform']
  language: string
  languages: string[]
  userAgentData: UserAgentDataProfile
  webgl: WebGLConfig
}

/**
 * Generate JavaScript code to inject fingerprint overrides
 */
export function generateInjectionScript(
  profile: FingerprintProfile,
  runtimeNavigator: RuntimeNavigatorConfig
): string {
  const config = JSON.stringify({
    navigator: {
      ...profile.navigator,
      userAgent: runtimeNavigator.userAgent,
      platform: runtimeNavigator.platform,
      language: runtimeNavigator.language,
      languages: runtimeNavigator.languages,
      vendor: 'Google Inc.'
    },
    userAgentData: runtimeNavigator.userAgentData,
    screen: profile.screen,
    webgl: runtimeNavigator.webgl,
    canvas: profile.canvas,
    audio: profile.audio
  })

  return `
(function() {
  'use strict';

  const config = ${config};
  const nativeFunctionNames = new WeakMap();
  const originalFunctionToString = Function.prototype.toString;

  function markNative(fn, name) {
    try {
      nativeFunctionNames.set(fn, name || fn.name || '');
    } catch (e) {}
    return fn;
  }

  const functionToStringProxy = new Proxy(originalFunctionToString, {
    apply: function(target, thisArg, args) {
      if (nativeFunctionNames.has(thisArg)) {
        const name = nativeFunctionNames.get(thisArg);
        return 'function ' + name + '() { [native code] }';
      }
      return Reflect.apply(target, thisArg, args);
    }
  });
  markNative(functionToStringProxy, 'toString');
  Function.prototype.toString = functionToStringProxy;

  function defineGetter(target, prop, value) {
    try {
      const getterName = 'get ' + String(prop);
      const getter = markNative(function() { return value; }, getterName);
      try {
        Object.defineProperty(getter, 'name', { value: getterName, configurable: true });
      } catch (e) {}
      Object.defineProperty(target, prop, {
        get: getter,
        configurable: true
      });
    } catch (e) {}
  }

  function defineValue(target, prop, value, enumerable) {
    try {
      Object.defineProperty(target, prop, {
        value: value,
        writable: false,
        enumerable: !!enumerable,
        configurable: true
      });
    } catch (e) {}
  }

  // Store original functions for later use
  const originalGetParameter = window.WebGLRenderingContext && WebGLRenderingContext.prototype.getParameter;
  const originalGetParameter2 = window.WebGL2RenderingContext && WebGL2RenderingContext.prototype.getParameter;
  const originalToDataURL = window.HTMLCanvasElement && HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = window.HTMLCanvasElement && HTMLCanvasElement.prototype.toBlob;
  const originalGetImageData = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype.getImageData;
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  const originalGetFloatFrequencyData = window.AnalyserNode && AnalyserNode.prototype.getFloatFrequencyData;

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
    defineGetter(Navigator.prototype, prop, descriptor.value);
  }

  // ========== User-Agent Client Hints ==========

  try {
    function createUserAgentData(data) {
      const brands = Object.freeze(data.brands.map(function(brand) {
        return Object.freeze({ brand: brand.brand, version: brand.version });
      }));
      const fullVersionList = Object.freeze(data.fullVersionList.map(function(brand) {
        return Object.freeze({ brand: brand.brand, version: brand.version });
      }));

      const getHighEntropyValues = markNative(function(hints) {
        const response = {
          brands: brands,
          mobile: data.mobile,
          platform: data.platform
        };
        const highEntropyValues = {
          architecture: data.architecture,
          bitness: data.bitness,
          fullVersionList: fullVersionList,
          model: data.model,
          platformVersion: data.platformVersion,
          uaFullVersion: data.uaFullVersion,
          wow64: data.wow64
        };

        if (Array.isArray(hints)) {
          for (const hint of hints) {
            if (Object.prototype.hasOwnProperty.call(highEntropyValues, hint)) {
              response[hint] = highEntropyValues[hint];
            }
          }
        }

        return Promise.resolve(response);
      }, 'getHighEntropyValues');

      const toJSON = markNative(function() {
        return {
          brands: brands,
          mobile: data.mobile,
          platform: data.platform
        };
      }, 'toJSON');

      const userAgentData = {
        brands: brands,
        mobile: data.mobile,
        platform: data.platform,
        getHighEntropyValues: getHighEntropyValues,
        toJSON: toJSON
      };

      if (typeof NavigatorUAData !== 'undefined') {
        Object.setPrototypeOf(userAgentData, NavigatorUAData.prototype);
      }

      return Object.freeze(userAgentData);
    }

    defineGetter(Navigator.prototype, 'userAgentData', createUserAgentData(config.userAgentData));
  } catch (e) {}

  // ========== window.chrome Shim ==========

  try {
    const loadTimes = markNative(function() {
      const timing = performance.timing || {};
      const navigationStart = timing.navigationStart || Math.floor(performance.timeOrigin || Date.now());
      return {
        requestTime: navigationStart / 1000,
        startLoadTime: navigationStart / 1000,
        commitLoadTime: (timing.responseStart || navigationStart) / 1000,
        finishDocumentLoadTime: (timing.domContentLoadedEventEnd || navigationStart) / 1000,
        finishLoadTime: (timing.loadEventEnd || navigationStart) / 1000,
        firstPaintTime: 0,
        firstPaintAfterLoadTime: 0,
        navigationType: 'Other',
        wasFetchedViaSpdy: true,
        wasNpnNegotiated: true,
        npnNegotiatedProtocol: 'h2',
        wasAlternateProtocolAvailable: false,
        connectionInfo: 'h2'
      };
    }, 'loadTimes');

    const csi = markNative(function() {
      const timing = performance.timing || {};
      const navigationStart = timing.navigationStart || Math.floor(performance.timeOrigin || Date.now());
      return {
        startE: navigationStart,
        onloadT: timing.loadEventEnd || 0,
        pageT: Math.round(performance.now()),
        tran: 15
      };
    }, 'csi');

    const existingChrome = window.chrome || {};
    const chromeRuntime = existingChrome.runtime || {};
    const chromeObject = existingChrome;
    defineValue(chromeObject, 'runtime', chromeRuntime, true);
    defineValue(chromeObject, 'loadTimes', loadTimes, true);
    defineValue(chromeObject, 'csi', csi, true);
    defineGetter(window, 'chrome', chromeObject);
  } catch (e) {}

  // ========== Permissions Consistency ==========

  try {
    if (navigator.permissions && navigator.permissions.query) {
      const permissionsPrototype = Object.getPrototypeOf(navigator.permissions);
      const originalPermissionsQuery = permissionsPrototype.query;

      const query = markNative(function(parameters) {
        if (parameters && parameters.name === 'notifications') {
          const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
          const status = {
            state: permission === 'default' ? 'prompt' : permission,
            name: 'notifications',
            onchange: null
          };
          return Promise.resolve(status);
        }
        return originalPermissionsQuery.apply(this, arguments);
      }, 'query');

      permissionsPrototype.query = query;
    }
  } catch (e) {}

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
    defineGetter(Screen.prototype, prop, value);
  }

  // Device pixel ratio
  defineGetter(window, 'devicePixelRatio', config.screen.devicePixelRatio);

  // ========== WebGL Overrides ==========

  const WEBGL_VENDOR = 0x1F00;
  const WEBGL_RENDERER = 0x1F01;
  const UNMASKED_VENDOR_WEBGL = 0x9245;
  const UNMASKED_RENDERER_WEBGL = 0x9246;

  function spoofWebGLParameter(target) {
    return markNative(function getParameter(param) {
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
    }, 'getParameter');
  }

  if (originalGetParameter) {
    WebGLRenderingContext.prototype.getParameter = spoofWebGLParameter(originalGetParameter);
  }
  if (originalGetParameter2) {
    WebGL2RenderingContext.prototype.getParameter = spoofWebGLParameter(originalGetParameter2);
  }

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

  function createNoisyCanvas(sourceCanvas) {
    if (!sourceCanvas.width || !sourceCanvas.height) {
      return null;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = sourceCanvas.width;
    exportCanvas.height = sourceCanvas.height;

    const exportContext = exportCanvas.getContext('2d');
    if (!exportContext) {
      return null;
    }

    exportContext.drawImage(sourceCanvas, 0, 0);
    const imageData = originalGetImageData.call(exportContext, 0, 0, exportCanvas.width, exportCanvas.height);
    addCanvasNoise(imageData);
    exportContext.putImageData(imageData, 0, 0);
    return exportCanvas;
  }

  if (originalGetImageData) {
    // Override getImageData
    CanvasRenderingContext2D.prototype.getImageData = markNative(function getImageData(sx, sy, sw, sh) {
      const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
      return addCanvasNoise(imageData);
    }, 'getImageData');
  }

  if (originalToDataURL && originalGetImageData) {
    // Override toDataURL
    HTMLCanvasElement.prototype.toDataURL = markNative(function toDataURL(type, quality) {
      try {
        const exportCanvas = createNoisyCanvas(this);
        if (exportCanvas) {
          return originalToDataURL.call(exportCanvas, type, quality);
        }
      } catch (e) {
        // Canvas may be tainted, skip noise
      }
      return originalToDataURL.call(this, type, quality);
    }, 'toDataURL');
  }

  if (originalToBlob && originalGetImageData) {
    // Override toBlob
    HTMLCanvasElement.prototype.toBlob = markNative(function toBlob(callback, type, quality) {
      try {
        const exportCanvas = createNoisyCanvas(this);
        if (exportCanvas) {
          return originalToBlob.call(exportCanvas, callback, type, quality);
        }
      } catch (e) {
        // Canvas may be tainted, skip noise
      }
      return originalToBlob.call(this, callback, type, quality);
    }, 'toBlob');
  }

  // ========== Audio Fingerprint Noise ==========

  const audioRandom = seededRandom(config.audio.seed);

  if (AudioContextConstructor && originalGetFloatFrequencyData) {
    AnalyserNode.prototype.getFloatFrequencyData = markNative(function getFloatFrequencyData(array) {
      originalGetFloatFrequencyData.call(this, array);
      const noise = config.audio.noise;
      for (let i = 0; i < array.length; i++) {
        if (audioRandom() < noise * 10) {
          array[i] += (audioRandom() - 0.5) * 0.0001;
        }
      }
    }, 'getFloatFrequencyData');
  }

  // ========== Remove webdriver flag ==========

  defineGetter(Navigator.prototype, 'webdriver', false);

  // ========== Plugin/MimeType Spoofing ==========

  try {
    const mimeDefinitions = [
      {
        type: 'application/pdf',
        suffixes: 'pdf',
        description: 'Portable Document Format'
      },
      {
        type: 'text/pdf',
        suffixes: 'pdf',
        description: 'Portable Document Format'
      }
    ];

    const pluginDefinitions = [
      { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
    ];

    const pluginItem = markNative(function item(index) {
      return this[index] || null;
    }, 'item');
    const pluginNamedItem = markNative(function namedItem(name) {
      return this[name] || null;
    }, 'namedItem');
    const pluginArrayItem = markNative(function item(index) {
      return this[index] || null;
    }, 'item');
    const pluginArrayNamedItem = markNative(function namedItem(name) {
      return this[name] || null;
    }, 'namedItem');
    const pluginRefresh = markNative(function refresh() {}, 'refresh');
    const mimeTypeArrayItem = markNative(function item(index) {
      return this[index] || null;
    }, 'item');
    const mimeTypeArrayNamedItem = markNative(function namedItem(name) {
      return this[name] || null;
    }, 'namedItem');

    function makeMimeType(definition, plugin) {
      const mimeType = {};
      defineValue(mimeType, 'type', definition.type, true);
      defineValue(mimeType, 'suffixes', definition.suffixes, true);
      defineValue(mimeType, 'description', definition.description, true);
      defineValue(mimeType, 'enabledPlugin', plugin, true);
      if (typeof MimeType !== 'undefined') {
        Object.setPrototypeOf(mimeType, MimeType.prototype);
      }
      return mimeType;
    }

    function makePlugin(definition) {
      const plugin = {};
      const mimeTypes = mimeDefinitions.map(function(mimeDefinition) {
        return makeMimeType(mimeDefinition, plugin);
      });

      defineValue(plugin, 'name', definition.name, true);
      defineValue(plugin, 'filename', definition.filename, true);
      defineValue(plugin, 'description', definition.description, true);
      defineValue(plugin, 'length', mimeTypes.length, false);
      defineValue(plugin, 'item', pluginItem, false);
      defineValue(plugin, 'namedItem', pluginNamedItem, false);

      mimeTypes.forEach(function(mimeType, index) {
        defineValue(plugin, String(index), mimeType, true);
        defineValue(plugin, mimeType.type, mimeType, false);
      });

      if (typeof Plugin !== 'undefined') {
        Object.setPrototypeOf(plugin, Plugin.prototype);
      }
      return plugin;
    }

    function makePluginArray(plugins) {
      const pluginArray = {};
      defineValue(pluginArray, 'length', plugins.length, false);
      defineValue(pluginArray, 'item', pluginArrayItem, false);
      defineValue(pluginArray, 'namedItem', pluginArrayNamedItem, false);
      defineValue(pluginArray, 'refresh', pluginRefresh, false);
      defineValue(pluginArray, Symbol.iterator, Array.prototype[Symbol.iterator].bind(plugins), false);

      plugins.forEach(function(plugin, index) {
        defineValue(pluginArray, String(index), plugin, true);
        defineValue(pluginArray, plugin.name, plugin, false);
      });

      if (typeof PluginArray !== 'undefined') {
        Object.setPrototypeOf(pluginArray, PluginArray.prototype);
      }
      return pluginArray;
    }

    function makeMimeTypeArray(mimeTypes) {
      const mimeTypeArray = {};
      defineValue(mimeTypeArray, 'length', mimeTypes.length, false);
      defineValue(mimeTypeArray, 'item', mimeTypeArrayItem, false);
      defineValue(mimeTypeArray, 'namedItem', mimeTypeArrayNamedItem, false);
      defineValue(mimeTypeArray, Symbol.iterator, Array.prototype[Symbol.iterator].bind(mimeTypes), false);

      mimeTypes.forEach(function(mimeType, index) {
        defineValue(mimeTypeArray, String(index), mimeType, true);
        defineValue(mimeTypeArray, mimeType.type, mimeType, false);
      });

      if (typeof MimeTypeArray !== 'undefined') {
        Object.setPrototypeOf(mimeTypeArray, MimeTypeArray.prototype);
      }
      return mimeTypeArray;
    }

    const plugins = pluginDefinitions.map(makePlugin);
    const mimeTypes = [plugins[0][0], plugins[0][1]];
    const pluginArray = makePluginArray(plugins);
    const mimeTypeArray = makeMimeTypeArray(mimeTypes);

    defineGetter(Navigator.prototype, 'plugins', pluginArray);
    defineGetter(Navigator.prototype, 'mimeTypes', mimeTypeArray);
  } catch (e) {}

})();
`.trim()
}
