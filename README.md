# Hulu Ad Muter

A tiny browser extension that mutes Hulu ads so you can watch without a wall of commercials, including those back-to-back prescription-drug ads.

During an ad break it mutes only the Hulu video in that tab, then restores your previous volume when the show comes back. It does not mute your whole browser. A toolbar popup gives you a simple on/off toggle.

This repo has two versions:

- **[Chrome](chrome/README.md)** — load unpacked in Chrome (or other Chromium browsers)
- **[Firefox](firefox/README.md)** — install in Firefox Developer Edition or Nightly, or load temporarily in regular Firefox

A signed build for regular Firefox is coming. That version needs to be signed by Mozilla before it can be installed permanently in ordinary Firefox.

Made by [Ultrademic Studios](https://github.com/Ultrademic) (Miri).

## Early version

This is an early release:

- It has not been tested on every Hulu ad layout, and Hulu changes its player often, so the selectors may need tuning.
- The first split second of an ad may still be audible.
- It does not skip or block ads. They still play, just quietly.
- It works in the browser on your computer only, not on TV apps, Roku, consoles, or the Hulu mobile app.

## If it misses an ad

Turn on **Debug logging** in the popup, copy the `[Hulu Ad Muter]` lines from the Hulu tab's developer console, and [open an issue](https://github.com/Ultrademic/hulu-ad-muter/issues/new). The [Chrome](chrome/README.md#if-it-misses-an-ad-or-mutes-the-show-by-mistake) and [Firefox](firefox/README.md#if-it-misses-an-ad-or-mutes-the-show-by-mistake) READMEs have the exact steps.

## Credits

Detection ideas and selectors came from these public open-source projects and writeups. Each version's README explains what was borrowed:

- [kyle-stadler/hulu-muter](https://github.com/kyle-stadler/hulu-muter)
- [MikeEckels/HuluSkipper](https://github.com/MikeEckels/HuluSkipper)
- [t0rr3sp3dr0's Hulu-AdBlocker gist](https://gist.github.com/t0rr3sp3dr0/af7824f6968e5190d276507fa7ac603c)
- Public analyses of the "Hulu Ad Skipper | Ad Blocker [QVI]" extension
- [DeHor-Labs/openparty Hulu adapter](https://github.com/DeHor-Labs/openparty)
- BotGentz "Hulu Ad Countdown Overlay"
- Adblock Plus community filters

## License

[MIT](LICENSE). Copyright 2026 Miranda Martin / Ultrademic Studios.

This project is not affiliated with, endorsed by, or associated with Hulu or Disney.
