/* Script Studio GM API runtime — injected before userscript body. */
(function () {
  'use strict';

  var SS_MSG = 'SS_GM_BRIDGE';
  var scriptId = typeof __SS_SCRIPT_ID__ !== 'undefined' ? __SS_SCRIPT_ID__ : '';
  var grants = (typeof __SS_GRANTS__ !== 'undefined' && __SS_GRANTS__) || [];
  var grantSet = {};
  for (var i = 0; i < grants.length; i++) grantSet[grants[i]] = true;
  var noneGrant = grantSet.none;

  function hasGrant(g) {
    if (noneGrant) return g === 'GM_info' || g === 'GM_log';
    return grantSet[g] || g === 'GM_info' || g === 'GM_log';
  }

  function bridge(type, payload, cb) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          { type: SS_MSG, sub: type, scriptId: scriptId, payload: payload || {} },
          function (res) {
            if (cb) cb(res && res.ok ? res.data : null, res && !res.ok ? res.error : null);
          },
        );
        return;
      }
    } catch (e) {
      if (cb) cb(null, String(e));
    }
  }

  function promisify(fn) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      return new Promise(function (resolve, reject) {
        fn.apply(
          null,
          args.concat(function (err, result) {
            if (err) reject(err);
            else resolve(result);
          }),
        );
      });
    };
  }

  var localValues =
    typeof __SS_VALUES__ !== 'undefined' && __SS_VALUES__ ? JSON.parse(JSON.stringify(__SS_VALUES__)) : {};
  var valueListeners = {};

  var GM_info =
    typeof __SS_GM_INFO__ !== 'undefined'
      ? __SS_GM_INFO__
      : { script: { grant: grants }, scriptHandler: 'Script Studio' };

  function GM_log() {
    var a = Array.prototype.slice.call(arguments);
    console.log.apply(console, ['[Script Studio]', GM_info.script && GM_info.script.name].concat(a));
  }

  function GM_addStyle(css) {
    if (!hasGrant('GM_addStyle') && !noneGrant) return null;
    var el = document.createElement('style');
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
    return el;
  }

  function GM_addElement(a, b, c) {
    if (!hasGrant('GM_addElement') && !noneGrant) return null;
    var parent = document.documentElement;
    var tag = 'div';
    var attrs = {};
    if (typeof a === 'string') tag = a;
    else if (a && a.nodeType === 1) {
      parent = a;
      tag = typeof b === 'string' ? b : 'div';
      attrs = c || {};
    } else attrs = b || {};
    if (typeof b === 'object' && !b.nodeType) attrs = b;
    var node = document.createElement(tag);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        if (k === 'textContent') node.textContent = attrs[k];
        else if (k === 'innerHTML') node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    parent.appendChild(node);
    return node;
  }

  function GM_getResourceText(name) {
    var res = GM_info.script && GM_info.script.resources;
    if (res && res[name] && res[name].text != null) return res[name].text;
    var map = typeof __SS_RESOURCES__ !== 'undefined' ? __SS_RESOURCES__ : {};
    return map[name] && map[name].text != null ? map[name].text : '';
  }

  function GM_getResourceURL(name) {
    var map = typeof __SS_RESOURCES__ !== 'undefined' ? __SS_RESOURCES__ : {};
    if (map[name] && map[name].blobUrl) return map[name].blobUrl;
    var text = GM_getResourceText(name);
    if (!text) return '';
    try {
      var blob = new Blob([text], { type: 'application/octet-stream' });
      return URL.createObjectURL(blob);
    } catch (e) {
      return '';
    }
  }

  function GM_setValue(key, value, cb) {
    if (!hasGrant('GM_setValue')) {
      if (cb) cb(null);
      return;
    }
    var old = localValues[key];
    localValues[key] = value;
    bridge('setValue', { key: key, value: value, old: old }, function () {
      fireValueListeners(key, old, value, false);
      if (cb) cb(null);
    });
  }

  function GM_getValue(key, def, cb) {
    if (!hasGrant('GM_getValue')) {
      var v = def;
      if (cb) cb(v);
      return v;
    }
    var out = Object.prototype.hasOwnProperty.call(localValues, key) ? localValues[key] : def;
    if (cb) cb(out);
    return out;
  }

  function GM_deleteValue(key, cb) {
    var old = localValues[key];
    delete localValues[key];
    bridge('deleteValue', { key: key }, function () {
      fireValueListeners(key, old, undefined, false);
      if (cb) cb(null);
    });
  }

  function GM_listValues(cb) {
    var keys = Object.keys(localValues);
    if (cb) cb(keys);
    return keys;
  }

  function GM_setValues(obj, cb) {
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) GM_setValue(k, obj[k]);
    if (cb) cb(null);
  }

  function GM_getValues(keysOrDef, cb) {
    var out = {};
    if (Array.isArray(keysOrDef)) {
      for (var i = 0; i < keysOrDef.length; i++) out[keysOrDef[i]] = GM_getValue(keysOrDef[i]);
    } else if (keysOrDef && typeof keysOrDef === 'object') {
      for (var k in keysOrDef)
        if (Object.prototype.hasOwnProperty.call(keysOrDef, k)) out[k] = GM_getValue(k, keysOrDef[k]);
    }
    if (cb) cb(out);
    return out;
  }

  function GM_deleteValues(keys, cb) {
    for (var i = 0; i < keys.length; i++) GM_deleteValue(keys[i]);
    if (cb) cb(null);
  }

  function fireValueListeners(key, oldVal, newVal, remote) {
    var list = valueListeners[key] || [];
    for (var i = 0; i < list.length; i++) {
      try {
        list[i](key, oldVal, newVal, remote);
      } catch (e) {
        GM_log(e);
      }
    }
  }

  function GM_addValueChangeListener(key, fn) {
    var id = 'l_' + Math.random().toString(36).slice(2);
    if (!valueListeners[key]) valueListeners[key] = [];
    valueListeners[key].push(fn);
    bridge('addValueListener', { key: key, listenerId: id });
    return id;
  }

  function GM_removeValueChangeListener(id) {
    bridge('removeValueListener', { listenerId: id });
  }

  function GM_xmlhttpRequest(details) {
    if (!hasGrant('GM_xmlhttpRequest')) {
      if (details.onerror) details.onerror({ error: 'grant missing' });
      return { abort: function () {} };
    }
    var aborted = false;
    bridge('xmlhttpRequest', { details: details }, function (data, err) {
      if (aborted) return;
      if (err && details.onerror) details.onerror({ error: err });
      else if (data && details.onload) details.onload(data);
    });
    return {
      abort: function () {
        aborted = true;
        bridge('xmlhttpAbort', { requestId: details.context });
      },
    };
  }

  function GM_download(a, b, c) {
    if (!hasGrant('GM_download')) return { abort: function () {} };
    var details = typeof a === 'string' ? { url: a, name: b, onload: c } : a;
    bridge('download', { details: details });
    return { abort: function () {} };
  }

  function GM_notification(a, b, c, d) {
    var details = typeof a === 'string' ? { text: a, title: b, image: c, onclick: d } : a;
    bridge('notification', { details: details });
  }

  function GM_openInTab(url, opts, cb) {
    bridge('openInTab', { url: url, options: opts || {} }, function (data) {
      if (cb && data) cb(data);
    });
  }

  function GM_registerMenuCommand(name, fn, opts) {
    var id = bridge('registerMenuCommand', { name: name, options: opts || {} });
    bridge('registerMenuCommand', { name: name, options: opts || {}, fnRef: true });
    return 'mc_' + scriptId + '_' + name;
  }

  function GM_unregisterMenuCommand(id) {
    bridge('unregisterMenuCommand', { menuId: id });
  }

  function GM_setClipboard(data, info, cb) {
    bridge('setClipboard', { data: data, info: info }, function () {
      if (cb) cb();
    });
  }

  function GM_getTab(cb) {
    bridge('getTab', {}, function (data) {
      if (cb) cb(data);
    });
  }

  function GM_saveTab(tab, cb) {
    bridge('saveTab', { tab: tab }, function () {
      if (cb) cb();
    });
  }

  function GM_getTabs(cb) {
    bridge('getTabs', {}, function (data) {
      if (cb) cb(data || {});
    });
  }

  function GM_cookie(action, details, cb) {
    bridge('cookie', { action: action, details: details }, function (data, err) {
      if (cb) cb(err ? null : data, err);
    });
  }

  var GM_cookie_obj = {
    list: function (details, cb) {
      GM_cookie('list', details, cb);
    },
    set: function (details, cb) {
      GM_cookie('set', details, cb);
    },
    delete: function (details, cb) {
      GM_cookie('delete', details, cb);
    },
  };

  if (hasGrant('unsafeWindow') || noneGrant) {
    try {
      if (typeof unsafeWindow === 'undefined') {
        // eslint-disable-next-line no-var
        var unsafeWindow = window.wrappedJSObject || window;
      }
    } catch (e) {
      /* page isolation */
    }
  }

  if (grantSet['window.onurlchange'] || grantSet['window.onurlchange'.toLowerCase()]) {
    if (window.onurlchange === null) {
      var lastHref = location.href;
      var emitUrl = function () {
        if (location.href === lastHref) return;
        lastHref = location.href;
        window.dispatchEvent(new CustomEvent('urlchange', { detail: { url: location.href } }));
      };
      var origPush = history.pushState;
      var origReplace = history.replaceState;
      history.pushState = function () {
        origPush.apply(this, arguments);
        emitUrl();
      };
      history.replaceState = function () {
        origReplace.apply(this, arguments);
        emitUrl();
      };
      window.addEventListener('popstate', emitUrl);
      window.addEventListener('hashchange', emitUrl);
    }
  }

  var GM = {
    info: GM_info,
    log: GM_log,
    setValue: promisify(function (key, value, cb) {
      GM_setValue(key, value, function () {
        cb(null);
      });
    }),
    getValue: promisify(function (key, def, cb) {
      cb(null, GM_getValue(key, def));
    }),
    deleteValue: promisify(function (key, cb) {
      GM_deleteValue(key, function () {
        cb(null);
      });
    }),
    listValues: promisify(function (cb) {
      cb(null, GM_listValues());
    }),
    xmlHttpRequest: promisify(function (details, cb) {
      GM_xmlhttpRequest(
        Object.assign({}, details, {
          onload: function (r) {
            cb(null, r);
          },
          onerror: function (e) {
            cb(e);
          },
        }),
      );
    }),
    download: promisify(function (details, cb) {
      GM_download(details);
      cb(null);
    }),
    notification: promisify(function (details, cb) {
      GM_notification(details);
      cb(null);
    }),
    openInTab: promisify(function (url, opts, cb) {
      GM_openInTab(url, opts, function (tab) {
        cb(null, tab);
      });
    }),
    setClipboard: promisify(function (data, info, cb) {
      GM_setClipboard(data, info, function () {
        cb(null);
      });
    }),
    getTab: promisify(function (cb) {
      GM_getTab(function (t) {
        cb(null, t);
      });
    }),
    saveTab: promisify(function (tab, cb) {
      GM_saveTab(tab, function () {
        cb(null);
      });
    }),
    getTabs: promisify(function (cb) {
      GM_getTabs(function (t) {
        cb(null, t);
      });
    }),
    getResourceText: function (name) {
      return GM_getResourceText(name);
    },
    getResourceUrl: function (name) {
      return GM_getResourceURL(name);
    },
    cookie: {
      list: promisify(function (d, cb) {
        GM_cookie_obj.list(d, function (r) {
          cb(null, r);
        });
      }),
      set: promisify(function (d, cb) {
        GM_cookie_obj.set(d, function (r) {
          cb(null, r);
        });
      }),
      delete: promisify(function (d, cb) {
        GM_cookie_obj.delete(d, function (r) {
          cb(null, r);
        });
      }),
    },
  };

  var exports = {
    GM_info: GM_info,
    GM_log: GM_log,
    GM_addStyle: GM_addStyle,
    GM_addElement: GM_addElement,
    GM_getResourceText: GM_getResourceText,
    GM_getResourceURL: GM_getResourceURL,
    GM_setValue: GM_setValue,
    GM_getValue: GM_getValue,
    GM_deleteValue: GM_deleteValue,
    GM_listValues: GM_listValues,
    GM_setValues: GM_setValues,
    GM_getValues: GM_getValues,
    GM_deleteValues: GM_deleteValues,
    GM_addValueChangeListener: GM_addValueChangeListener,
    GM_removeValueChangeListener: GM_removeValueChangeListener,
    GM_xmlhttpRequest: GM_xmlhttpRequest,
    GM_download: GM_download,
    GM_notification: GM_notification,
    GM_openInTab: GM_openInTab,
    GM_registerMenuCommand: GM_registerMenuCommand,
    GM_unregisterMenuCommand: GM_unregisterMenuCommand,
    GM_setClipboard: GM_setClipboard,
    GM_getTab: GM_getTab,
    GM_saveTab: GM_saveTab,
    GM_getTabs: GM_getTabs,
    GM_cookie: GM_cookie_obj,
    GM: GM,
  };

  for (var key in exports) {
    if (Object.prototype.hasOwnProperty.call(exports, key)) {
      try {
        window[key] = exports[key];
      } catch (e) {
        /* strict mode page */
      }
    }
  }
})();
