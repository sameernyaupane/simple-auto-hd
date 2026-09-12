![Logo image](/icons/sahd-128.png)
## Simple Auto HD
Simple Auto HD quality selector for YouTube. Up to 8k/4k (60fps/50fps/48fps/30fps) supported. Theater mode.

Pick a preferred quality once and every video plays at it — on watch pages and on
Shorts. Quality is set through YouTube's own player API, so the settings menu
never flickers open, and it works the same in every interface language.

- **Preferred quality** — best available, a specific resolution down to 144p, or Auto.
  A resolution means "that resolution at the highest frame rate YouTube offers",
  so `1080p` picks `1080p60` when it exists. If the video does not go that high,
  the next best is used.
- **Premium quality** (off by default) — include YouTube's "1080p Premium"
  enhanced-bitrate streams.
- **Theater mode** — kept on or off automatically, and stays in sync when you
  toggle it yourself with the button or the `t` shortcut.
- **Appearance** — Auto, Light or Dark for the popup itself.

Requires Chrome 111 or later.

## Latest Releases:
Check out the releases page here: [https://github.com/sameernyaupane/simple-auto-hd/releases](https://github.com/sameernyaupane/simple-auto-hd/releases).

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## Development

```sh
npm install
npm run build     # bundles src/ into dist/
npm run watch     # rebuild on change
npm test          # unit tests for the pure logic
npm run lint
npm run package   # zip dist/ for the Chrome Web Store
```

Load the extension with **Load unpacked** in `chrome://extensions`, pointed at
`dist/` — not the repository root.

### Layout

| Path | Role |
| --- | --- |
| `src/lib/` | Pure logic: quality tiers and selection, settings schema, bridge protocol. Unit-tested, no DOM and no `chrome.*`. |
| `src/main/` | Runs in the page's own realm, the only place YouTube's player methods are reachable. Reports state and actuates; holds no policy. |
| `src/isolated/` | The controller. Owns settings, decides what to apply, and drives theater mode. Includes the DOM-menu fallback. |
| `src/popup/`, `src/background/` | Popup UI and the service worker. |

The two worlds talk over `window.postMessage` with an origin-, source- and
direction-checked envelope; everything arriving from the page realm is treated as
untrusted input.

## Leave us a review!
Please give us a review comment on the chrome web store if you found the extension helpful! :)

[Chrome Web Store](https://chrome.google.com/webstore/detail/simple-auto-hd-open-sourc/jnofiabkigekemighcdaejlpgdhmbaog)

## Issues
If you have any issues or suggestions please post them here:
[https://github.com/sameernyaupane/simple-auto-hd/issues](https://github.com/sameernyaupane/simple-auto-hd/issues)
