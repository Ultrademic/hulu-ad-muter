/**
 * Tiny WebExtension API helper used by the background script, content
 * script, and popup.
 *
 * Firefox prefers browser.* (promise-based). Chrome uses chrome.*
 * (callback-based). Firefox also exposes chrome.*, but those methods
 * return promises, so this normalizes storage, action, and messaging
 * so the same calls work in either namespace.
 */
(function (global) {
  "use strict";

  const ext =
    typeof global.browser !== "undefined" && global.browser.runtime
      ? global.browser
      : global.chrome;

  function lastError() {
    return ext.runtime && ext.runtime.lastError;
  }

  function asPromise(returned, withCallback) {
    if (returned && typeof returned.then === "function") return returned;
    return new Promise(function (resolve, reject) {
      try {
        const result = withCallback(function (value) {
          const err = lastError();
          if (err) reject(err);
          else resolve(value);
        });
        // If a promise-only API ignored the callback and returned a promise,
        // use that instead of waiting for a callback that will never run.
        if (result && typeof result.then === "function") {
          result.then(resolve, reject);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  const api = {
    ext: ext,

    storageGet: function (defaults) {
      return asPromise(null, function (cb) {
        return ext.storage.local.get(defaults, cb);
      });
    },

    storageSet: function (values) {
      return asPromise(null, function (cb) {
        return ext.storage.local.set(values, cb);
      });
    },

    onStorageChanged: function (listener) {
      ext.storage.onChanged.addListener(listener);
    },

    setBadgeText: function (options) {
      const result = ext.action.setBadgeText(options);
      if (result && typeof result.then === "function") {
        return result.catch(function () {});
      }
    },

    setBadgeBackgroundColor: function (options) {
      const result = ext.action.setBadgeBackgroundColor(options);
      if (result && typeof result.then === "function") {
        return result.catch(function () {});
      }
    },

    sendMessage: function (message) {
      // Background may be asleep; storage still has the status.
      try {
        const result = ext.runtime.sendMessage(message, function () {
          void lastError();
        });
        if (result && typeof result.then === "function") {
          return result.catch(function () {});
        }
      } catch (err) {
        // No receiver, or the API rejected synchronously.
      }
    },

    onInstalled: function (listener) {
      ext.runtime.onInstalled.addListener(listener);
    },

    onMessage: function (listener) {
      ext.runtime.onMessage.addListener(listener);
    },
  };

  global.HuluAdMuterApi = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
