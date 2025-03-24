((window) => {
  const {
    screen: { width, height },
    navigator: { language, doNotTrack: ndnt, msDoNotTrack: msdnt },
    location,
    document,
    history,
    top,
    doNotTrack,
  } = window;
  const { hostname, href, origin } = location;
  const { currentScript, referrer } = document;
  const localStorage = href.startsWith('data:') ? undefined : window.localStorage;

  if (!currentScript) return;

  const _data = 'mdata-';
  const _false = 'false';
  const _true = 'true';
  const attr = currentScript.getAttribute.bind(currentScript);
  const dev = attr(_data + 'dev') === _true;
  const website = attr(_data + 'website-id');
  const tag = attr(_data + 'tag');
  const autoTrack = attr(_data + 'auto-track') !== _false;
  const dnt = attr(_data + 'do-not-track') === _true;
  const excludeSearch = attr(_data + 'exclude-search') === _true;
  const excludeHash = attr(_data + 'exclude-hash') === _true;
  const domain = attr(_data + 'domains') || '';
  const domains = domain.split(',').map((n) => n.trim());
  const host = dev ? 'http://localhost:3000' : 'https://multipost.app';
  const endpoint = `${host.replace(/\/$/, '')}/api/multidata/collector/website`;
  const screen = `${width}x${height}`;
  const eventRegex = /mdata-multidata-event-([\w-_]+)/;
  const eventNameAttribute = _data + 'multidata-event';
  const delayDuration = 300;

  /* Helper functions */

  const isExternalLink = (href) => {
    if (!href) return false;
    try {
      const url = new URL(href, window.location.href);
      return url.hostname !== window.location.hostname;
    } catch (e) {
      return false;
    }
  };

  const handleLinkInteraction = async (element) => {
    if (element.tagName === 'A') {
      const { href, textContent, target } = element;
      if (href && isExternalLink(href)) {
        return track(
          'external_link',
          {
            url: href,
            text: textContent.trim(),
            target,
          },
          'predefinedEvent',
        );
      }
    }
  };

  const handleVisibilityChange = () => {
    const isVisible = document.visibilityState === 'visible';
    const currentTime = Date.now();
    let duration = 0;
    let eventName;

    if (isVisible) {
      // 用户返回页面 - 页面变为可见
      eventName = 'page_visible';
      if (lastHiddenTimestamp) {
        duration = currentTime - lastHiddenTimestamp;
      }
    } else {
      // 用户离开页面 - 页面变为不可见
      eventName = 'page_hidden';
      if (lastVisibilityChangeTimestamp) {
        duration = currentTime - lastVisibilityChangeTimestamp;
      }
    }

    track(
      eventName,
      {
        timestamp: currentTime,
        state: document.visibilityState,
        duration: duration,
      },
      'predefinedEvent',
    );

    lastVisibilityChangeTimestamp = currentTime;
    if (!isVisible) {
      lastHiddenTimestamp = currentTime;
    }
  };

  // 处理用户进入页面的事件
  const handlePageEnter = () => {
    const currentTime = Date.now();
    track(
      'page_enter',
      {
        timestamp: currentTime,
      },
      'predefinedEvent',
    );
    pageEnterTimestamp = currentTime;
  };

  // 处理用户退出页面的事件
  const handlePageExit = () => {
    const currentTime = Date.now();
    let duration = 0;

    if (pageEnterTimestamp) {
      duration = currentTime - pageEnterTimestamp;
    }

    track(
      'page_exit',
      {
        timestamp: currentTime,
        duration: duration,
      },
      'predefinedEvent',
    );
  };

  const getPayload = () => ({
    website,
    screen,
    language,
    title,
    hostname,
    url: currentUrl,
    referrer: currentRef,
    tag: tag ? tag : undefined,
  });

  const hasDoNotTrack = () => {
    const dnt = doNotTrack || ndnt || msdnt;
    return dnt === 1 || dnt === '1' || dnt === 'yes';
  };

  /* Event handlers */

  const handlePush = (state, title, url) => {
    if (!url) return;

    currentRef = currentUrl;
    currentUrl = new URL(url, location.href);

    if (excludeSearch) {
      currentUrl.search = '';
    }

    if (excludeHash) {
      currentUrl.hash = '';
    }

    currentUrl = currentUrl.toString();

    if (currentUrl !== currentRef) {
      setTimeout(track, delayDuration);
    }
  };

  const handlePathChanges = () => {
    const hook = (_this, method, callback) => {
      const orig = _this[method];

      return (...args) => {
        callback.apply(null, args);

        return orig.apply(_this, args);
      };
    };

    history.pushState = hook(history, 'pushState', handlePush);
    history.replaceState = hook(history, 'replaceState', handlePush);
  };

  const handleTitleChanges = () => {
    const observer = new MutationObserver(([entry]) => {
      title = entry && entry.target ? entry.target.text : undefined;
    });

    const node = document.querySelector('head > title');

    if (node) {
      observer.observe(node, {
        subtree: true,
        characterData: true,
        childList: true,
      });
    }
  };

  const handleClicks = () => {
    document.addEventListener(
      'click',
      async (e) => {
        const isSpecialTag = (tagName) => ['BUTTON', 'A'].includes(tagName);

        const el = e.target;
        const linkElement = isSpecialTag(el.tagName) ? el : el.closest('a');

        if (linkElement && linkElement.tagName === 'A') {
          await handleLinkInteraction(linkElement);
        }

        // 保留原有的事件处理逻辑
        const trackElement = async (el) => {
          const attr = el.getAttribute.bind(el);
          const eventName = attr(eventNameAttribute);

          if (eventName) {
            const eventData = {};

            el.getAttributeNames().forEach((name) => {
              const match = name.match(eventRegex);

              if (match) {
                eventData[match[1]] = attr(name);
              }
            });

            return track(eventName, eventData);
          }
        };

        const findParentTag = (rootElem, maxSearchDepth) => {
          let currentElement = rootElem;
          for (let i = 0; i < maxSearchDepth; i++) {
            if (isSpecialTag(currentElement.tagName)) {
              return currentElement;
            }
            currentElement = currentElement.parentElement;
            if (!currentElement) {
              return null;
            }
          }
        };

        const parentElement = isSpecialTag(el.tagName) ? el : findParentTag(el, 10);

        if (parentElement) {
          const { href, target } = parentElement;
          const eventName = parentElement.getAttribute(eventNameAttribute);

          if (eventName) {
            if (parentElement.tagName === 'A') {
              const external =
                target === '_blank' || e.ctrlKey || e.shiftKey || e.metaKey || (e.button && e.button === 1);

              if (eventName && href) {
                if (!external) {
                  e.preventDefault();
                }
                return trackElement(parentElement).then(() => {
                  if (!external) {
                    (target === '_top' ? top.location : location).href = href;
                  }
                });
              }
            } else if (parentElement.tagName === 'BUTTON') {
              return trackElement(parentElement);
            }
          }
        } else {
          return trackElement(el);
        }
      },
      true,
    );
  };

  /* Tracking functions */

  const trackingDisabled = () =>
    disabled ||
    !website ||
    (localStorage && localStorage.getItem('multidata.disabled')) ||
    (domain && !domains.includes(hostname)) ||
    (dnt && hasDoNotTrack());

  const send = async (payload, type = 'event') => {
    if (trackingDisabled()) return;

    const headers = {
      'Content-Type': 'application/json',
    };

    if (typeof cache !== 'undefined') {
      headers['x-multidata-cache'] = cache;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ type, payload }),
        headers,
        credentials: 'omit',
      });

      const data = await res.json();

      if (data) {
        disabled = !!data.disabled;
        cache = data.cache;
      }
    } catch (e) {
      /* empty */
    }
  };

  const init = () => {
    if (!initialized) {
      // 记录用户进入页面事件
      handlePageEnter();

      track();
      handlePathChanges();
      handleTitleChanges();
      handleClicks();

      // 添加键盘事件监听
      document.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const activeElement = document.activeElement;
          if (activeElement && activeElement.tagName === 'A') {
            await handleLinkInteraction(activeElement);
          }
        }
      });

      // 添加页面可见性变化监听
      document.addEventListener('visibilitychange', handleVisibilityChange, false);

      // 添加页面卸载事件监听
      window.addEventListener('beforeunload', handlePageExit);
      window.addEventListener('unload', handlePageExit);

      initialized = true;
    }
  };

  const track = (obj, data, type = 'event') => {
    if (typeof obj === 'string') {
      return send(
        {
          ...getPayload(),
          name: obj,
          data: typeof data === 'object' ? data : undefined,
        },
        type,
      );
    } else if (typeof obj === 'object') {
      return send(obj, type);
    } else if (typeof obj === 'function') {
      return send(obj(getPayload()), type);
    }
    return send(getPayload(), type);
  };

  const identify = (data) => send({ ...getPayload(), data }, 'identify');

  /* Start */

  if (!window.multidata) {
    window.multidata = {
      track,
      identify,
    };
  }

  let currentUrl = href;
  let currentRef = referrer.startsWith(origin) ? '' : referrer;
  let title = document.title;
  let cache;
  let initialized;
  let disabled = false;
  let lastVisibilityChangeTimestamp = Date.now();
  let lastHiddenTimestamp = 0;
  let pageEnterTimestamp = 0;

  if (autoTrack && !trackingDisabled()) {
    if (document.readyState === 'complete') {
      init();
    } else {
      document.addEventListener('readystatechange', init, true);
    }
  }
})(window);
