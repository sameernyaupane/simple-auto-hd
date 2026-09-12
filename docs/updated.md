## Simple Auto HD has been updated to v2.1.0!

This release rebuilds how the extension sets video quality. It now uses YouTube's
own player API instead of opening the settings menu and clicking through it, so
the menu no longer flickers on every video and the extension behaves the same in
every interface language.

Your existing settings carry over — there is nothing to reconfigure.

### Fixed
1. Changing the quality setting while on the YouTube homepage, search results or a
   channel page used to throw an error. YouTube now shows a hover-preview player
   there, which the old code mistook for a real video.
2. Choosing **Auto** on a non-English YouTube used to fail, because the extension
   looked for the literal word "Auto" — which is "Automatisch" in German and
   "自動" in Japanese.
3. The same failure happened on slow connections, whenever the quality menu took
   longer than a tenth of a second to appear. There is now a proper readiness
   check and a retry.
4. Quality is re-applied when YouTube reloads the player — autoplaying to the next
   video, or coming back from an ad. Previously it was set once and then forgotten.

### New
1. **Shorts support**, with a toggle to turn it off.
2. **Premium quality** — an opt-in toggle for YouTube's "1080p Premium"
   enhanced-bitrate streams. Off by default.
3. Works on `m.youtube.com` and `music.youtube.com`.
4. The popup has been redesigned and now shows which quality it applied.
5. A light/dark **Appearance** setting — leave it on Auto to follow your system,
   or pick Light or Dark yourself.
6. Toggling theater mode with the **`t`** key syncs back to the extension, not just
   clicking the button.

### Note
This version needs Chrome 111 or later, and asks for permission to run on
`m.youtube.com` and `music.youtube.com`.

Check out the releases page here: [https://github.com/sameernyaupane/simple-auto-hd/releases](https://github.com/sameernyaupane/simple-auto-hd/releases).

## Leave us a review!
Please give us a review comment on the chrome web store if you found the extension helpful! :)
[Chrome Web Store](https://chrome.google.com/webstore/detail/simple-auto-hd-open-sourc/jnofiabkigekemighcdaejlpgdhmbaog)

## Issues
If you have any issues or suggestions please post them here:
[https://github.com/sameernyaupane/simple-auto-hd/issues](https://github.com/sameernyaupane/simple-auto-hd/issues)
