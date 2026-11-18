/**
 * Service worker: keeps the toolbar badge in sync with ad / show status.
 * No network access. Status comes from the content script via messaging
 * and chrome.storage.local.
 */
"use strict";

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
  chrome.action.setBadgeText(Object.assign({ text: badge.text }, options));
  chrome.action.setBadgeBackgroundColor(Object.assign({ color: badge.color }, options));
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get({ enabled: true, debug: false }, function (stored) {
    if (typeof stored.enabled === "undefined") {
      chrome.storage.local.set({ enabled: true, debug: false, status: "idle" });
    }
  });
});

chrome.runtime.onMessage.addListener(function (message, sender) {
  if (!message || message.type !== "hulu-ad-muter-status") return;
  const tabId = sender.tab && sender.tab.id;
  applyBadge(message.status, tabId);
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area !== "local") return;
  if (changes.enabled && changes.enabled.newValue === false) {
    applyBadge("off");
  }
});
