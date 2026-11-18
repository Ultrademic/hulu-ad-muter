/**
 * Hulu Ad Muter — content script (https://www.hulu.com/*)
 *
 * Detects ad playback with several UI signals, mutes the playing <video>
 * element(s), then restores the viewer's previous mute state when the show
 * returns. Only this Hulu tab is affected.
 *
 * Detection ideas and selectors were collected from public open-source
 * Hulu muters/skippers. See README.md for credits. Hulu changes its player
 * often, so this is best-effort and untested against a live signed-in session.
 */
(function () {
  "use strict";

  const api = HuluAdMuterApi;

  const POLL_MS = 500;
  const OBSERVER_DEBOUNCE_MS = 80;
  const MIN_VIDEO_AREA = 40000; // ~200x200, skip hover previews
  const STORAGE_KEYS = { enabled: "enabled", debug: "debug" };

  /**
   * Known ad-chrome selectors, from public OSS (see README).
   * Prefer data-testid and exact class names; include [class*="..."] fallbacks
   * because Hulu often hashes CSS module class names.
   */
  const AD_SELECTORS = [
    // DeHor-Labs/openparty Hulu adapter (June 2026)
    '[data-testid="ads-ui"]',
    '[data-testid="ad-badge"]',
    ".HuluPlayer--ad-container",
    '[class*="AdBreakBadge"]',
    '[class*="ad-ui-container"]',
    // kyle-stadler/hulu-muter (2023) and public analyses of QVI Hulu Ad Skipper
    ".AdUnitView",
    ".AdUnitView__adBar__timer",
    '[class*="AdUnitView"]',
    // MikeEckels/HuluSkipper
    ".ad-top-bar-container",
    '[class*="ad-top-bar"]',
    // t0rr3sp3dr0 Hulu-AdBlocker gist (2022)
    ".AdPlayer",
    ".Timeline__playhead--ad",
    // BotGentz Hulu Ad Countdown Overlay
    ".ad-countdown",
    ".ad-timer",
    ".countdown-timer",
    '[class*="ad-countdown" i]',
    '[class*="ad-timer" i]',
    // Adblock Plus community filters
    ".vpaid-ad-slot",
    "#vpaid-ad-slot",
  ];

  const PLAYER_ROOT_SELECTORS = [
    "#content-video-player",
    '[class*="PlayerControls"]',
    ".video-player",
    '[class*="HuluPlayer"]',
  ];

  const VIDEO_SELECTORS = [
    "#content-video-player video",
    '[class*="PlayerControls"] video',
    ".video-player video",
    ".video-player",
  ];

  // Short badge / label text only. Avoid matching "Add to My List", "Adult", etc.
  const AD_TEXT_PATTERNS = [
    /^ad$/i,
    /^ads$/i,
    /^ad\s+\d+\s+of\s+\d+$/i,
    /^ad\s+\d+\s+of\s+\d+\s+\d{1,2}:\d{2}$/i,
    /\bad\s+\d+\s+of\s+\d+\b/i,
    /\badvertisement\b/i,
    /\bwhy this ad\b/i,
    /\bvisit advertiser\b/i,
    /\blearn more about this ad\b/i,
    /\bskip(?:\s+this)?\s+ads?\b/i,
    /\bad break\b/i,
  ];

  const AD_ATTR_PATTERNS = [
    /^ad$/i,
    /^ads$/i,
    /\bad\s+\d+\s+of\s+\d+\b/i,
    /\badvertisement\b/i,
    /\bwhy this ad\b/i,
    /\bvisit advertiser\b/i,
    /\bad break\b/i,
    /\bcommercial\b/i,
  ];

  let settings = { enabled: true, debug: false };
  let pollId = 0;
  let observer = null;
  let observerTimer = 0;
  let lastStatus = "";
  let lastSignal = "";
  let adActive = false;
  let userUnmutedDuringAd = false;
  const savedMute = new WeakMap(); // video -> muted state before we muted
  const volumeListeners = new WeakSet();

  function log() {
    if (!settings.debug) return;
    const args = Array.prototype.slice.call(arguments);
    args.unshift("[Hulu Ad Muter]");
    console.log.apply(console, args);
  }

  function isVisible(el) {
    if (!(el instanceof Element)) return false;
    if (el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true") {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (
      !style ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    if (
      rect.bottom < 0 ||
      rect.right < 0 ||
      rect.top > (window.innerHeight || 0) ||
      rect.left > (window.innerWidth || 0)
    ) {
      return false;
    }
    return true;
  }

  function ownText(el) {
    let text = "";
    for (let i = 0; i < el.childNodes.length; i++) {
      const node = el.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || "";
      }
    }
    return text.replace(/\s+/g, " ").trim();
  }

  function compactText(el) {
    const own = ownText(el);
    if (own) return own;
    const full = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (full.length > 0 && full.length <= 48) return full;
    return own;
  }

  function matchesAny(text, patterns) {
    if (!text) return false;
    for (let i = 0; i < patterns.length; i++) {
      if (patterns[i].test(text)) return true;
    }
    return false;
  }

  function playerRoots() {
    const roots = [];
    for (let i = 0; i < PLAYER_ROOT_SELECTORS.length; i++) {
      const found = document.querySelectorAll(PLAYER_ROOT_SELECTORS[i]);
      for (let j = 0; j < found.length; j++) roots.push(found[j]);
    }
    return roots.length ? roots : [document.body || document.documentElement];
  }

  function detectBySelector() {
    for (let i = 0; i < AD_SELECTORS.length; i++) {
      const selector = AD_SELECTORS[i];
      let nodes;
      try {
        nodes = document.querySelectorAll(selector);
      } catch (err) {
        continue;
      }
      for (let j = 0; j < nodes.length; j++) {
        if (isVisible(nodes[j])) {
          return selector;
        }
      }
    }
    return null;
  }

  function detectByTextOrAria() {
    const roots = playerRoots();
    const seen = new Set();
    for (let r = 0; r < roots.length; r++) {
      const root = roots[r];
      if (!root || seen.has(root)) continue;
      seen.add(root);
      const candidates = root.querySelectorAll(
        "span, p, div, button, a, label, [aria-label], [title], [role='status'], [data-testid], [class*='ad' i], [class*='Ad']"
      );
      const limit = Math.min(candidates.length, 400);
      for (let i = 0; i < limit; i++) {
        const el = candidates[i];
        if (!isVisible(el)) continue;

        const aria = el.getAttribute("aria-label") || "";
        const title = el.getAttribute("title") || "";
        const testid = el.getAttribute("data-testid") || "";
        if (matchesAny(aria, AD_ATTR_PATTERNS)) {
          return 'aria-label="' + aria + '"';
        }
        if (matchesAny(title, AD_ATTR_PATTERNS)) {
          return 'title="' + title + '"';
        }
        if (matchesAny(testid, AD_ATTR_PATTERNS) || /^(ads?-ui|ad-badge|ad-timer)$/i.test(testid)) {
          return 'data-testid="' + testid + '"';
        }

        const text = compactText(el);
        if (text && matchesAny(text, AD_TEXT_PATTERNS)) {
          return 'text "' + text + '"';
        }
      }
    }
    return null;
  }

  function detectAd() {
    const bySelector = detectBySelector();
    if (bySelector) return { isAd: true, signal: "selector " + bySelector };
    const byText = detectByTextOrAria();
    if (byText) return { isAd: true, signal: byText };
    return { isAd: false, signal: "" };
  }

  function getPlayerVideos() {
    const found = new Set();
    for (let i = 0; i < VIDEO_SELECTORS.length; i++) {
      let nodes;
      try {
        nodes = document.querySelectorAll(VIDEO_SELECTORS[i]);
      } catch (err) {
        continue;
      }
      for (let j = 0; j < nodes.length; j++) {
        if (nodes[j].tagName === "VIDEO") found.add(nodes[j]);
      }
    }
    const all = document.querySelectorAll("video");
    for (let i = 0; i < all.length; i++) {
      const video = all[i];
      const area = (video.offsetWidth || 0) * (video.offsetHeight || 0);
      if (area >= MIN_VIDEO_AREA || (!video.paused && !video.ended)) {
        found.add(video);
      }
    }
    return Array.from(found);
  }

  function onVolumeChange(event) {
    const video = event.target;
    if (!adActive || !settings.enabled) return;
    if (video && video.muted === false) {
      userUnmutedDuringAd = true;
      log("viewer unmuted during an ad; leaving it unmuted until the next ad");
    }
  }

  function watchVolume(video) {
    if (volumeListeners.has(video)) return;
    video.addEventListener("volumechange", onVolumeChange);
    volumeListeners.add(video);
  }

  function muteForAd(videos) {
    if (!adActive) userUnmutedDuringAd = false;
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      watchVolume(video);
      if (!savedMute.has(video)) {
        savedMute.set(video, !!video.muted);
        log("saved prior mute state", video.muted);
      }
      if (!userUnmutedDuringAd && video.muted !== true) {
        video.muted = true;
        log("muted video for ad");
      }
    }
  }

  function restoreAfterAd(videos) {
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      if (savedMute.has(video)) {
        const prior = savedMute.get(video);
        video.muted = prior;
        savedMute.delete(video);
        log("restored prior mute state", prior);
      }
    }
    userUnmutedDuringAd = false;
  }

  function setStatus(status, signal) {
    if (status === lastStatus && signal === lastSignal) return;
    lastStatus = status;
    lastSignal = signal;
    api.storageSet({
      status: status,
      signal: signal,
      updatedAt: Date.now(),
    }).catch(function () {});
    // Background may be asleep; storage still has the status.
    api.sendMessage({ type: "hulu-ad-muter-status", status: status });
  }

  function tick() {
    if (!settings.enabled) {
      if (adActive) {
        restoreAfterAd(getPlayerVideos());
        adActive = false;
      }
      setStatus("off", "");
      return;
    }

    const videos = getPlayerVideos();
    const result = detectAd();

    if (result.isAd) {
      muteForAd(videos);
      if (!adActive || result.signal !== lastSignal) {
        log("ad detected via", result.signal);
      }
      adActive = true;
      setStatus("ad", result.signal);
      return;
    }

    if (adActive) {
      log("ad ended; show is back");
      restoreAfterAd(videos);
      adActive = false;
    }

    if (videos.length === 0) {
      setStatus("idle", "");
    } else {
      setStatus("show", "");
    }
  }

  function scheduleTick() {
    if (observerTimer) clearTimeout(observerTimer);
    observerTimer = setTimeout(function () {
      observerTimer = 0;
      tick();
    }, OBSERVER_DEBOUNCE_MS);
  }

  function startObserver() {
    if (observer) observer.disconnect();
    const target = document.body || document.documentElement;
    if (!target) return;
    observer = new MutationObserver(scheduleTick);
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden", "aria-label", "data-testid", "title"],
    });
  }

  function applySettings(next) {
    const wasEnabled = settings.enabled;
    settings.enabled = next.enabled !== false;
    settings.debug = !!next.debug;
    if (wasEnabled && !settings.enabled) {
      log("turned off; restoring mute state if needed");
      tick();
    } else if (!wasEnabled && settings.enabled) {
      log("turned on");
      tick();
    }
  }

  function boot() {
    api
      .storageGet({ enabled: true, debug: false, status: "idle" })
      .then(function (stored) {
        applySettings(stored);
        startObserver();
        tick();
        pollId = setInterval(tick, POLL_MS);
        log("running on", location.href);
      })
      .catch(function () {});

    api.onStorageChanged(function (changes, area) {
      if (area !== "local") return;
      if (!changes[STORAGE_KEYS.enabled] && !changes[STORAGE_KEYS.debug]) return;
      api.storageGet({ enabled: true, debug: false }).then(applySettings).catch(function () {});
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
