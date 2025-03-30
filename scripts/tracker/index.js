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
  const endpoint = `${host.replace(/\/$/, '')}/api/analytics/web/collect`;
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

  // 记录可见和不可见的时间，并发送可见性变化事件
  const handleVisibilityChange = () => {
    // 如果未被标记为有效会话，则不处理
    if (!validSession) return;

    const isVisible = document.visibilityState === 'visible';
    const currentTime = Date.now();

    if (isVisible) {
      // 用户返回页面 - 页面变为可见
      // 初始化可见时间计数器
      visibleStartTime = currentTime;
      totalVisibleTime = 0; // 重新开始计算可见时间

      // 清除之前的计时器（如果有）
      if (returnPageTimeout) {
        clearTimeout(returnPageTimeout);
      }

      // 设置计时器，返回页面也要等待5秒才发送进入事件
      returnPageTimeout = setTimeout(() => {
        // 发送页面进入事件
        track(
          'page_enter',
          {
            timestamp: currentTime,
            state: 'visible',
          },
          'predefinedEvent',
        );
      }, 5000); // 5秒
    } else {
      // 用户离开页面 - 页面变为不可见
      // 如果有等待中的返回页面计时器，取消它
      if (returnPageTimeout) {
        clearTimeout(returnPageTimeout);
        returnPageTimeout = null;
      }

      // 计算用户在此次可见期间的停留时间
      if (visibleStartTime > 0) {
        totalVisibleTime += currentTime - visibleStartTime;
        visibleStartTime = 0; // 重置开始时间
      }

      // 发送页面退出事件
      sendBeacon(
        {
          ...getPayload(),
          name: 'page_exit',
          data: {
            timestamp: currentTime,
            state: 'hidden',
            visibleDuration: totalVisibleTime,
          },
        },
        'predefinedEvent',
      );
    }
  };

  // 处理用户首次进入页面的事件
  const handlePageEnter = () => {
    const currentTime = Date.now();

    // 初始化可见时间计数器
    visibleStartTime = currentTime;
    totalVisibleTime = 0;

    // 设置计时器，只有停留超过5秒才发送进入事件
    pageEnterTimeout = setTimeout(() => {
      track(
        'page_enter',
        {
          timestamp: currentTime,
          state: 'initial', // 首次进入标记为initial
        },
        'predefinedEvent',
      );
      validSession = true; // 标记为有效会话
    }, 5000); // 5秒
  };

  // 处理用户完全关闭页面的事件
  const handlePageExit = () => {
    // 如果停留时间不足5秒或未被标记为有效会话，则不记录退出事件
    if (!validSession) return;

    // 清除进入页面的超时计时器，避免重复计数
    if (pageEnterTimeout) {
      clearTimeout(pageEnterTimeout);
      pageEnterTimeout = null;
    }

    const currentTime = Date.now();

    // 如果当前页面是可见的，要加上当前这段可见时间
    if (document.visibilityState === 'visible' && visibleStartTime > 0) {
      totalVisibleTime += currentTime - visibleStartTime;
    }

    // 使用sendBeacon确保数据在页面关闭前发送成功
    sendBeacon(
      {
        ...getPayload(),
        name: 'page_exit',
        data: {
          timestamp: currentTime,
          state: 'closed', // 区分是完全关闭页面的退出
          visibleDuration: totalVisibleTime, // 只记录可见状态下的停留时间
        },
      },
      'predefinedEvent',
    );

    // 重置会话状态
    validSession = false;
    visibleStartTime = 0;
    totalVisibleTime = 0;
  };

  // 添加会话超时处理，如果用户长时间不活动，重置会话
  const setupSessionTimeout = () => {
    // 30分钟无活动，会话过期
    const SESSION_TIMEOUT = 30 * 60 * 1000;

    // 用户活动事件列表
    const userActivityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    let sessionTimeoutId = null;

    // 重置会话超时
    const resetSessionTimeout = () => {
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
      }

      // 如果是有效会话，设置超时
      if (validSession) {
        sessionTimeoutId = setTimeout(() => {
          // 会话超时，记录一个退出事件
          handlePageExit();
        }, SESSION_TIMEOUT);
      }
    };

    // 为用户活动事件添加监听器
    userActivityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetSessionTimeout, { passive: true });
    });

    // 初始化会话超时
    resetSessionTimeout();
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

  // 使用navigator.sendBeacon发送数据（适用于页面卸载场景）
  const sendBeacon = (payload, type = 'event') => {
    if (trackingDisabled() || !navigator.sendBeacon) return false;

    const data = JSON.stringify({
      type,
      payload,
    });

    return navigator.sendBeacon(endpoint, data);
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

      // 添加会话超时处理
      setupSessionTimeout();

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
  let pageEnterTimeout = null;
  let returnPageTimeout = null; // 用户返回页面后的计时器
  let validSession = false;
  let visibleStartTime = 0; // 记录页面变为可见的开始时间
  let totalVisibleTime = 0; // 累计页面可见的总时间

  if (autoTrack && !trackingDisabled()) {
    if (document.readyState === 'complete') {
      init();
    } else {
      document.addEventListener('readystatechange', init, true);
    }
  }
})(window);
