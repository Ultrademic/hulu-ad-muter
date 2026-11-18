/**
 * Toolbar popup: on/off toggle, live status, and optional debug logging.
 * Settings live in extension storage so the content script can react immediately.
 * Uses HuluAdMuterApi so this works with both browser.* and chrome.*.
 */
(function () {
  "use strict";

  const api = HuluAdMuterApi;
  const enabledEl = document.getElementById("enabled");
  const debugEl = document.getElementById("debug");
  const statusEl = document.getElementById("status");
  const signalEl = document.getElementById("signal");

  const STATUS_TEXT = {
    ad: "Ad detected — muted",
    show: "Show playing",
    idle: "Waiting for a Hulu video…",
    off: "Paused (extension off)",
  };

  function render(stored) {
    enabledEl.checked = stored.enabled !== false;
    debugEl.checked = !!stored.debug;

    const status = stored.enabled === false ? "off" : stored.status || "idle";
    statusEl.textContent = STATUS_TEXT[status] || STATUS_TEXT.idle;
    statusEl.className = "status status-" + status;

    if (stored.debug && stored.signal && status === "ad") {
      signalEl.hidden = false;
      signalEl.textContent = "Detected by: " + stored.signal;
    } else {
      signalEl.hidden = true;
      signalEl.textContent = "";
    }
  }

  function load() {
    api
      .storageGet({ enabled: true, debug: false, status: "idle", signal: "" })
      .then(render)
      .catch(function () {});
  }

  enabledEl.addEventListener("change", function () {
    api.storageSet({ enabled: enabledEl.checked }).catch(function () {});
  });

  debugEl.addEventListener("change", function () {
    api.storageSet({ debug: debugEl.checked }).catch(function () {});
  });

  api.onStorageChanged(function (changes, area) {
    if (area !== "local") return;
    load();
  });

  load();
})();
