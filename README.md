# Dragon Touch Classic15 Pro

Agenda and finger-drawing whiteboard for this frame's Android 4.4.2 stock
browser (`com.android.browser`), build `Classic15-Pro_A33.080124_V02`.
The computer runs both web servers and must stay awake on the same network.
The frame needs no additional apps.

## Install

Run from any directory on a Mac, or a Linux host with Homebrew available when
missing tools need installing. Existing tools from other installers are accepted.
The checkout can have any name and live anywhere, including a path with spaces.
Scripts locate the project from their own file paths, not your current directory.
Use the absolute path to your own checkout in the commands below.

```sh
sh /absolute/path/to/dragon-touch-classic15/scripts/install-host.sh
```

This checks **Node 20 or newer, npm, and ADB**, installs missing tools through
Homebrew, runs `npm ci --ignore-scripts` in `agenda/`, and offers an optional
hidden calendar-URL prompt in an interactive terminal. Press Enter to keep your
existing settings. If Homebrew's Node is
outdated, it upgrades it. Node runs on the computer, not on the frame.
Java, Android SDK build-tools, upstream dashboard sources, and APKs are not
needed. The installer does not modify shell startup files.

If an older Node from a version manager takes priority in a new terminal,
select Node 20+ in that manager before starting the servers. Check with
`node --version`, `npm --version`, and `adb version`.

## Calendar settings

The installer and setup command offer a hidden prompt that saves a calendar
URL directly to `agenda/calendars.env`, keeping existing feeds and settings.
Run it again to add another calendar:

```sh
node /absolute/path/to/dragon-touch-classic15/scripts/setup-calendar.mjs
```

On iPhone, open **Calendar > Calendars**, tap the info button beside an iCloud
calendar you own, enable **Public Calendar**, then choose **Share Link > Copy**.
If you need a new calendar, use **Calendars > Add Calendar** and select iCloud
as its account. Paste the copied link into the hidden terminal prompt and
press Enter. See [Apple's iPhone instructions](https://support.apple.com/guide/iphone/share-icloud-calendars-iph7613c4fb/ios).

On a computer, open [iCloud Calendar](https://www.icloud.com/calendar/), use the
sharing/information control beside the calendar in the sidebar, turn on
**Public Calendar**, and choose **Copy**. See
[Apple's web instructions](https://support.apple.com/guide/icloud/share-a-calendar-mm6b1a9479/icloud).

This is a read-only subscription link, not an invitation to a private calendar.
Anyone who obtains it can read the shared calendar. Treat it as private project
data. Turning off Public Calendar stops this subscription from working.
The computer fetches the feed; its address is never sent to the frame.

To hand setup to a coding session, first save the link using the hidden prompt,
then tell the session: **“Use the calendar settings already in
agenda/calendars.env. Configure the frame and open Agenda and Whiteboard.”**
You can also explicitly provide the link to the session and ask it to save it
only in that file; the link will then be part of the chat history. The session
must not repeat it in replies, commands, logs, or documentation. The local prompt
avoids putting it in the conversation or shell history.

For manual setup, copy `agenda/calendars.env.example` to `agenda/calendars.env`
only if the latter does not exist, then edit that file. Google Calendar's
**Secret address in iCal format** also works. See the example for optional
labels, `PORT`, `DAYS`, `TZ`, and `CACHE_MINUTES`. Settings reload automatically;
changing `PORT` requires a restart. `AGENDA_CONFIG` can select another config file.

## Set up the frame and start both pages

After installing the host tools, connect the frame using
`sh scripts/connect.sh <frame-ip>`, or set `AGENDA_FRAME_IP` in your shell.
Then run:

```sh
sh /absolute/path/to/dragon-touch-classic15/scripts/setup.sh
```

Setup offers the calendar prompt (Enter keeps existing settings), checks the
frame build and optional `AGENDA_FRAME_SERIAL`, starts or reuses the two web
servers, disables `com.waophoto.smartframe`, and locks rotation to the settings
verified on this frame: auto-rotation off, user rotation 1. It wakes the display
and opens Whiteboard and Agenda in the stock browser, leaving Agenda selected.
The updater `com.adups.fota` is left enabled.

Setup uses a stable browser application ID for each page so subsequent runs can
reuse its tabs. Pre-existing unrelated tabs are not closed, and browser data,
bookmarks, and drawings are not erased. Close extra tabs manually on first setup.
If the computer has multiple network adapters, set `FRAME_HOST_IP` to the LAN
address reachable from the frame. Both ports must be available or serve the
expected page. An occupied unrelated port causes setup to stop before changing
frame settings.

Leave the setup terminal open for any servers it starts. Ctrl+C stops only
those servers; pre-existing servers keep running. If both were already running,
setup finishes after configuring the frame. The computer must remain awake.
Setup does not install a computer login service or change the Android home app.
To restore the stock photo app later, use `adb shell pm enable com.waophoto.smartframe`.

## Start the pages without changing the frame

```sh
sh /absolute/path/to/dragon-touch-classic15/scripts/start.sh
```

Leave this terminal running. The servers print their local network URLs:

- **Agenda:** port 8787 by default. Server-rendered views for Agenda, Day, Week,
  and Month; the page reloads every minute and feeds are cached for ten minutes.
- **Whiteboard:** port 8788 by default. Ink, Erase, Undo, Redo, Clear, and Save.
  PNG files go in `board/saves/`; automatic saves update `latest.png` every
  30 seconds when the current implementation detects changes. Reopening the
  page currently starts a blank canvas; it does not restore a saved drawing.

Open those two URLs in two tabs in the frame's stock browser. Anyone who can
reach the computer on that network can read the pages and saved drawings.
Keep this on a private network.

**Ctrl+C stops both servers started by this command.** If either server exits,
its companion stops too. If a port is already occupied, stop the existing
server first; the launcher does not reuse or kill existing processes. Existing
running servers do not need restarting just because files were reorganized.
Set `BOARD_PORT` in the shell to change the whiteboard port. The agenda port is
set in `agenda/calendars.env`.

To run only Agenda, use `sh scripts/serve-agenda.sh`. To run only Whiteboard,
use `node board/serve.js` from the project root. The whiteboard has no external
packages to install.

## Frame control

The frame supports root ADB over Wi-Fi on port 5555. Connect with
`sh scripts/connect.sh <frame-ip>`, then use the build-checked helper:

```sh
sh scripts/frame-adb.sh status
sh scripts/frame-adb.sh --help
```

The helper selects the sole connected device, or uses `AGENDA_FRAME_IP` when
set. `AGENDA_FRAME_SERIAL` adds an optional serial check. It can open a URL,
send taps, swipes, or keys, and capture screenshots outside this folder under
`/tmp` (or your OS temporary directory). Every action verifies the frame's build first.

`scripts/watch-agenda.sh` is optional: with `AGENDA_FRAME_IP` set, it checks
which app is in front every 60 seconds and reopens Agenda when necessary.
It leaves either browser tab alone while the browser is in front. It can
rediscover the frame after its network address changes.

Setup disables the stock photo app and leaves the
updater `com.adups.fota` enabled. Do not install the archived Firefox,
Rootless, or Home HQ APKs on this SDK 19 frame. Do not expose network ADB to
the internet or record LAN addresses, serials, or MAC addresses in this folder.

## Folder layout

```text
agenda/       Calendar server, settings, and tests
board/        Whiteboard page, server, and private saved drawings
scripts/      Install, calendar setup, frame setup, start, control, and watcher
AGENTS.md     Current instructions for coding agents
```

Local research, calendar feeds, saved drawings, screenshots, dependencies, and
credentials are excluded from Git. A private `research/` folder may exist in a
working copy; it is not part of the public repository and is not required.
The calendar fixtures under `agenda/test/fixtures/` are synthetic test data.
Historical upstream references are [photo-frame-dashboard](https://github.com/wesbos/photo-frame-dashboard)
and [kitchen-frame](https://github.com/huntsyea/kitchen-frame).

## Check changes

```sh
npm --prefix agenda test
node --test scripts/test/*.test.mjs
```

Ink, Undo, Redo, Erase, and Clear were verified on an Android 4.4 frame,
including physical finger input. Future UI changes must keep
that browser working: use ES5 browser JavaScript and avoid flexbox, grid, CSS
variables, `clamp`, and client-side calendar fetching.
