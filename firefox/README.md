# Hulu Ad Muter (Firefox)

This is the **Firefox** version of Hulu Ad Muter. It mutes **all ads** on [hulu.com](https://www.hulu.com/) in your browser, then unmutes when the show comes back.

It only changes the volume of the Hulu video in that tab. It does not mute your whole browser, and it does not skip or block the ads — they still play, just quietly.

See the [repository overview](../README.md) for the Chrome version too.

This package is **unsigned**. Firefox Developer Edition or Nightly can install it permanently after one about:config change. Regular Firefox will only allow a temporary install (removed when Firefox restarts).

A signed build for regular Firefox is coming. That version needs to be signed by Mozilla before it can be installed permanently in ordinary Firefox.

## How to load it in Firefox Developer Edition

### Permanent install (recommended)

Unsigned add-ons are blocked by default. Firefox Developer Edition can allow them:

1. Open `about:config`, accept the warning, and set `xpinstall.signatures.required` to **false**.
2. Open `about:addons` (or the menu → Add-ons and themes).
3. Click the gear icon and choose **Install Add-on From File…**
4. Pick an `.xpi` you made from this `firefox` folder (see below).
5. If Firefox asks, allow the extension to run on `www.hulu.com` (see [Host permission](#host-permission) below).
6. Reload any open Hulu tab so the extension can attach.

Setting `xpinstall.signatures.required` to false lets this unsigned add-on stay installed after restart. It also allows other unsigned add-ons, so only do this in a profile you trust.

**Making an `.xpi` from this folder:** zip the *contents* of this `firefox` folder (the files such as `manifest.json`, not the folder itself) and rename the zip to `hulu-ad-muter-firefox.xpi`. On Linux or macOS:

```bash
cd firefox
zip -r ../hulu-ad-muter-firefox.xpi .
```


### Temporary install (no about:config change)

Good for a quick test, but Firefox removes the add-on when it restarts:

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Pick `manifest.json` in this `firefox` folder, or an `.xpi` you made from it.
4. Reload any open Hulu tab.

### Host permission

The extension only needs access to `https://www.hulu.com/*`. In Firefox Manifest V3, host permissions are optional by default, so the content script may not run until that access is granted.

If ads are not muted after install:

1. Click the puzzle-piece icon in the toolbar, find **Hulu Ad Muter**, and allow it for `www.hulu.com` if Firefox offers that choice.
2. Or open `about:addons` → **Hulu Ad Muter** → **Permissions** (sometimes labeled **Permissions and data**) and enable access to `www.hulu.com`.
3. Reload the Hulu tab.

Temporary installs via `about:debugging` usually get this permission automatically.

## How to use the popup

Click the extension icon in the toolbar.

- **Mute ads** — the on/off switch. Turn this off if you want to hear ads again. If an ad is playing when you turn it off, the video is unmuted back to however you had it before.
- The status line tells you what it thinks is happening:
  - **Ad detected — muted**
  - **Show playing**
  - **Waiting for a Hulu video…** (you are on Hulu, but no player is going yet)
  - **Paused (extension off)**
- **Debug logging** — optional. When this is on, the extension writes short messages to the Hulu tab's Web Console, including which clue it used to decide an ad was playing.

Your settings are saved in Firefox, on this computer only. Nothing is sent anywhere.

## If it misses an ad (or mutes the show by mistake)

That can happen, because this was written from public Hulu player clues and could not be checked on a live account.

1. Turn on **Debug logging** in the popup.
2. On the Hulu tab, open the Web Console with **Ctrl+Shift+K** (or right-click → Inspect → Console).
3. Watch an ad (or the false mute) and look for lines that start with `[Hulu Ad Muter]`.
4. Copy those lines and [open a GitHub issue](https://github.com/Ultrademic/hulu-ad-muter/issues/new). If an ad was missed, also note anything you can see on screen during the ad, such as "Ad 1 of 3" or a countdown timer, and whether you were in full screen.

Those notes make it much easier to add the missing clue.

## What it does not do

- It does not work on a TV, Roku, game console, or the Hulu mobile app. Browser on your computer only.
- It does not skip, speed up, or hide ads.
- It does not change your Hulu account or plan.
- The first fraction of a second of an ad might still be audible, until the player shows its "Ad" badge.
- If Hulu redesigns the player, detection can break until the selectors are updated.
- It will not install permanently in regular (non-Developer / non-Nightly) Firefox, because this file is unsigned.

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

The extension only runs on `https://www.hulu.com/*`. It uses extension storage for the on/off switch, the debug toggle, and a short status line. It does not need your Hulu password, and it does not make network requests of its own.
