# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.1.0] - 2026-09-12

The extension now sets quality through YouTube's player API instead of
simulating clicks in the settings menu. The menu path is still there as a
fallback, but it no longer depends on knowing what "Quality" is called in the
viewer's language.

### Fixed
- Changing the quality setting while on a non-video YouTube page (the homepage,
  search results, a channel) threw a `TypeError`. YouTube's homepage now embeds a
  hover-preview player, so the old code found a settings button, clicked it, and
  then crashed when no quality menu appeared.
- Selecting **Auto** on any non-English YouTube threw the same `TypeError` — the
  quality ladder ended at the literal string `"Auto"`, which is `"Automatisch"` in
  German, `"自動"` in Japanese, and so on.
- The same crash occurred whenever the quality menu had not rendered within the
  hardcoded 100 ms delay. There is now a readiness check and a retry instead of a
  fixed wait.
- Quality is re-applied when YouTube reloads the player — autoplaying to the next
  video, or resuming after an ad. Previously the observer disconnected after the
  first video and never ran again.
- The settings menu can no longer be left hanging open if something goes wrong
  part-way through the fallback path.

### Added
- **YouTube Shorts support.** Quality is applied on `/shorts/` pages; there is a
  toggle to turn it off.
- **Opt-in Premium quality.** "1080p Premium" / enhanced-bitrate streams were
  previously skipped unconditionally; there is now a toggle, off by default so
  existing behaviour is unchanged.
- Support for `m.youtube.com`, `music.youtube.com` and bare `youtube.com`.
- The popup shows which quality was applied, and whether the fallback was used.
- Toggling theater mode with the **`t` keyboard shortcut** now syncs back to the
  extension. Previously only clicking the button did.
- An **Appearance** control — Auto, Light or Dark. Auto follows your system
  setting; Light and Dark override it.
- A build (esbuild), linter (ESLint), unit tests (`node --test`) and CI.

### Changed
- **Redesigned popup.** Compact header, grouped settings cards, proper toggle
  switches, and a status line with a state indicator. It has visible keyboard focus
  rings, respects reduced-motion, and meets WCAG AA contrast in both themes.
- Quality is set via the player API, so the settings menu no longer flickers open
  on every video.
- Theater mode is detected from the player layout rather than from a table of 67
  translated tooltips, and the quality menu is located structurally rather than
  from a table of 65 translated labels. Both tables are gone.
- The content script no longer runs in every frame, so it is no longer injected
  into ad iframes.
- Requires Chrome 111 or later (for `world: "MAIN"` content scripts).

### Note for existing users
Settings carry over as-is; nothing needs to be reconfigured. This release widens
the host permissions to cover `m.` and `music.youtube.com`, so Chrome will show a
permission prompt on update.

## [2.0.6] - 2024-09-25
- Version bump.

## [2.0.5] - 2023-06-13
- Mutation observer fix, extension enable/disable, two-way theater-mode binding.

## [2.0.4] - 2023-06-11
- Support for all YouTube interface languages, mutation observer instead of
  timeouts, redesigned popup, new logo.
