# Dragon Touch Classic15 Pro

## Supported setup

The supported frame runs Android 4.4.2, SDK 19, build
`Classic15-Pro_A33.080124_V02`. It is different from the Android 6 unit in
upstream issue #146. Use the stock browser, `com.android.browser`.
Read `README.md` for installation and operation. Scripts must locate resources
relative to their own file, work from any current directory, and support paths
with spaces. Never introduce a machine-specific checkout path or device address.

- `sh /absolute/path/to/scripts/install-host.sh` checks ADB, Node 20+, and npm,
  installs missing tools and agenda dependencies, and offers hidden URL entry.
  It does not install Java, SDK build-tools, dashboard sources, or APKs, or
  modify shell startup files.
- `node /absolute/path/to/scripts/setup-calendar.mjs` adds a feed without
  replacing existing feeds or settings. Noninteractive runs skip the prompt.
- `sh /absolute/path/to/scripts/setup.sh` verifies the frame, starts or reuses
  servers, disables only the photo app, sets `accelerometer_rotation=0` and
  `user_rotation=1`, and opens Whiteboard and Agenda. Running this setup is an
  explicit request to disable the photo app. Preserve unrelated browser tabs.
- `sh /absolute/path/to/scripts/start.sh` starts the two servers without
  changing the frame. Ctrl+C stops only its own children. Do not kill unrelated
  processes using the ports.
- Default ports are Agenda 8787 and Whiteboard 8788. `FRAME_HOST_IP` selects
  a host network interface; `AGENDA_FRAME_IP` selects the frame.

## Privacy and publishing

Keep the entire `research/` folder out of Git. Private feed URLs belong only
in `agenda/calendars.env` (or `AGENDA_CONFIG`). Preserve existing settings and
`board/saves/`. Never put private URLs in command arguments, HTML, logs, docs,
or replies. Prefer the hidden prompt. If a user explicitly provides a link,
save it only in the private config without repeating it.

Never commit personal calendar events, drawings, screenshots, device serials,
MAC addresses, LAN addresses, credentials, personal account details, local
checkout paths, or session logs. Calendar fixtures must be synthetic.
Check the staged files and commit author metadata before publishing.
Research files are optional local references and are absent from a public clone.

## Device control

Verify `ro.build.display.id` before any control or settings change. Use
`sh scripts/frame-adb.sh --help` for build-checked control. It selects the sole
connected device or `AGENDA_FRAME_IP`, with optional `AGENDA_FRAME_SERIAL`.
Keep screenshots in the OS temporary directory outside the checkout.
Never use another tool to bypass a permission restriction.

Do not install Firefox 143, Rootless, or Home HQ APKs on SDK 19. Do not disable
`com.adups.fota`, the updater. Do not change vendor packages without a user
request; running the documented setup authorizes only the photo app disable.

A verified display configuration uses portrait input coordinates (768 by 1366),
while screenshots arrive sideways (1366 by 768). Check orientation before
mapping screenshot points to ADB input. Do not infer success from exit codes
alone; inspect the screen after input.

## Development and verification

The agenda is server-rendered for Android 4.4. Browser scripts must use ES5;
avoid flexbox, grid, CSS variables, `clamp`, and client-side calendar fetching.
Node server scripts can use modern JavaScript. Run:

```sh
npm --prefix agenda test
node --test scripts/test/*.test.mjs
```

For UI changes, verify the stock browser on a frame and distinguish ADB input
from physical finger testing. Ink, Undo, Redo, Erase, and Clear have been
verified. The whiteboard saves PNGs but does not restore them on reopening.
Known open edge cases: Undo to an empty history skips autosave; failed autosaves
are marked saved before the response; another touch can replace an active
stroke; Redo lacks the active-drawing guard used by Undo and Clear.
