/**
 * Background event page: keeps the toolbar badge in sync with ad / show status.
 * No network access. Status comes from the content script via messaging
 * and extension storage. Loaded after api.js, which works with both
 * browser.* (Firefox) and chrome.* (Chrome-compatible) APIs.
 */
"use strict";

const api = HuluAdMuterApi;

const BADGE = {
  ad: { text: "AD", color: "#c06010" },
  show: { text: "", color: "#2de2e6" },
  idle: { text: "", color: "#2de2e6" },
  off: { text: "OFF", color: "#7d8b96" },
};

function applyBadge(status, tabId) {
  const badge = BADGE[status] || BADGE.idle;
  const options = {};
  if (typeof tabId === "number") options.tabId = tabId;
  api.setBadgeText(Object.assign({ text: badge.text }, options));
  api.setBadgeBackgroundColor(Object.assign({ color: badge.color }, options));
}

api.onInstalled(function () {
  api.storageGet({ enabled: true, debug: false }).then(function (stored) {
    if (typeof stored.enabled === "undefined") {
      return api.storageSet({ enabled: true, debug: false, status: "idle" });
    }
  }).catch(function () {});
});

api.onMessage(function (message, sender) {
  if (!message || message.type !== "hulu-ad-muter-status") return;
  const tabId = sender.tab && sender.tab.id;
  applyBadge(message.status, tabId);
});

api.onStorageChanged(function (changes, area) {
  if (area !== "local") return;
  if (changes.enabled && changes.enabled.newValue === false) {
    applyBadge("off");
  }
});
