# Hulu Ad Muter

This is the **Chrome** version of Hulu Ad Muter. It mutes **all ads** on [hulu.com](https://www.hulu.com/) in your browser, then unmutes when the show comes back.

See the [repository overview](../README.md) for the Firefox version too.

It only changes the volume of the Hulu video in that tab. It does not mute your whole browser, and it does not skip or block the ads — they still play, just quietly.

This was built for personal use and has **not been tested against a live signed-in Hulu session**. Hulu changes its player often, so you may need to tune it the first time you use it.

## How to load it in Chrome

Chrome will not install this from the Chrome Web Store. You load it yourself as an "unpacked" extension:

1. Download this repository (Code → Download ZIP) and unzip it, or clone it.
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (the switch in the top right).
4. Click **Load unpacked**.
5. Choose this `chrome` folder (the one that contains `manifest.json`).
6. Pin the extension if you like: click the puzzle-piece icon in the Chrome toolbar, then pin **Hulu Ad Muter**.

Open Hulu in the same Chrome profile, start a show, and leave the extension on. When an ad starts, the toolbar badge should say **AD** and the video should go quiet. When the show returns, your previous mute setting comes back (so if you already had the show muted, it stays muted).

## How to use the popup

Click the extension icon in the toolbar.

- **Mute ads** — the on/off switch. Turn this off if you want to hear ads again. If an ad is playing when you turn it off, the video is unmuted back to however you had it before.
- The status line tells you what it thinks is happening:
  - **Ad detected — muted**
  - **Show playing**
  - **Waiting for a Hulu video…** (you are on Hulu, but no player is going yet)
  - **Paused (extension off)**
- **Debug logging** — optional. When this is on, the extension writes short messages to the page's DevTools console, including which clue it used to decide an ad was playing.

Your settings are saved in Chrome, on this computer only. Nothing is sent anywhere.

## If it misses an ad (or mutes the show by mistake)

That can happen, because this was written from public Hulu player clues and could not be checked on a live account.

1. Turn on **Debug logging** in the popup.
2. On the Hulu tab, press **F12** (or right-click → Inspect) and open the **Console** panel.
3. Watch an ad (or the false mute) and look for lines that start with `[Hulu Ad Muter]`.
4. Copy those lines and [open a GitHub issue](https://github.com/Ultrademic/hulu-ad-muter/issues/new). If an ad was missed, also note anything you can see on screen during the ad, such as "Ad 1 of 3" or a countdown timer, and whether you were in full screen.

Those notes make it much easier to add the missing clue.

## What it does not do

- It does not work on a TV, Roku, game console, or the Hulu mobile app. Browser on your computer only.
- It does not skip, speed up, or hide ads.
- It does not change your Hulu account or plan.
- The first fraction of a second of an ad might still be audible, until the player shows its "Ad" badge.
- If Hulu redesigns the player, detection can break until the selectors are updated.

## How detection works

Hulu often stitches ads into the same video as the show (SSAI), so the extension cannot tell an ad from the show by the video file alone. Instead it looks for the on-screen ad chrome, about twice a second, and also watches the page for changes.

It treats a break as an ad if any of these are visible:

- Known player elements and class names from open-source Hulu tools (listed below), including `AdUnitView`, `ad-top-bar-container`, `AdPlayer`, `Timeline__playhead--ad`, `AdUnitView__adBar__timer`, `data-testid="ads-ui"`, `data-testid="ad-badge"`, and a few close variants.
- Short on-screen text such as "Ad", "Ad 1 of 3", a timer next to that text, "Advertisement", "Why this ad", "Visit advertiser", or "Skip ad".
- Matching `aria-label`, `title`, or `data-testid` values on player controls.

When an ad is detected, it sets `video.muted = true` on the playing Hulu `<video>` element(s), after remembering whether you already had them muted. When the ad chrome goes away, it restores that earlier setting. If you unmute by hand during an ad, it leaves that ad unmuted and will mute again on the next break.

## Credits

Detection ideas and selectors were copied from public open-source projects and writeups, not from a live Hulu login:

- [kyle-stadler/hulu-muter](https://github.com/kyle-stadler/hulu-muter) — looks for `.AdUnitView`
- [MikeEckels/HuluSkipper](https://github.com/MikeEckels/HuluSkipper) — looks for `.ad-top-bar-container`
- [t0rr3sp3dr0's Hulu-AdBlocker gist](https://gist.github.com/t0rr3sp3dr0/af7824f6968e5190d276507fa7ac603c) — `.AdPlayer`, `.Timeline__playhead--ad`, and `#content-video-player`
- Public analyses of the "Hulu Ad Skipper | Ad Blocker [QVI]" extension — `.AdUnitView__adBar__timer`
- [DeHor-Labs/openparty Hulu adapter](https://github.com/DeHor-Labs/openparty) (June 2026) — `[data-testid="ads-ui"]`, `[data-testid="ad-badge"]`, `.HuluPlayer--ad-container`, `[class*="AdBreakBadge"]`, `[class*="ad-ui-container"]`
- BotGentz "Hulu Ad Countdown Overlay" — `.ad-countdown`, `.ad-timer`, `.countdown-timer`, and "Ad" plus a number in the player text
- Adblock Plus community filters — `.vpaid-ad-slot`

Hulu may have changed its player since those were written. This extension uses several signals at once so one stale selector is less likely to break everything.

## Privacy

The extension only runs on `https://www.hulu.com/*`. It uses `chrome.storage` for the on/off switch, the debug toggle, and a short status line. It does not need your Hulu password, and it does not make network requests of its own.
