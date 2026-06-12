<p align="center">
  <img src="src/kimu/static/logo.svg" alt="Kimu" width="120" height="120">
</p>

<h1 align="center">Kimu</h1>

<p align="center">A tiny local viewer for a folder of Markdown docs.</p>

---

> [!IMPORTANT]
> **Disclaimer:** _This is internal tooling that I am sharing with you. It was more or less vibecoded; if you don't like that, please refrain from commenting. If you have any issues or suggestions, feel free to report them._

---

## What it does

Kimu serves a folder of `.md` files as a fast, single-page reader and scoped editor (edit tables, checkboxes). It features:

- **File tree** sidebar with collapsible folders
- **Tabs** — open multiple docs at once; click to switch, `×` or middle-click to close
- **Full-text search** across all docs (`/` to open)
- **Inline editing** — toggle checkboxes and edit tables. Changes save instantly.
- **Auto table of contents** with scroll-spy, per-document
- **Deep links** to any heading, and working internal links between docs
- **Reading settings** (font, size, width), light/dark theme, resizable sidebar
- **Easy to install**, no dependencies.

## Install

Kimu can be installed as a `kimu` command to `~/.local/bin` with [uv](https://docs.astral.sh/uv/). I

**1. Install uv** (if you don't have it):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**2. Get the code and install:**

```bash
git clone https://github.com/benja-opazo/kimu
cd kimu
uv tool install .
```

**3. Make sure `~/.local/bin` is on your PATH.** If `kimu` isn't found after install:

```bash
uv tool update-shell      # then restart your shell
```

### Update / uninstall

```bash
uv tool install . --reinstall   # after pulling new changes (run from the repo)
uv tool uninstall kimu
```

## Run

```bash
kimu                 # landing screen — pick a folder in the browser
kimu .               # serve the current directory
kimu ./docs          # serve a specific folder
kimu . -p 9000       # custom port (default 8765)
kimu --no-browser .  # don't auto-open a browser
```

`kimu` starts the server and opens it in your browser. With no folder it shows
a landing screen — click **Select folder…** to pick one with your OS's native
file dialog. Once a folder is open, the toolbar's folder button switches to
another. No separate app window, no dependencies.

### Without installing

```bash
uv run kimu ./docs           # or: uv run python -m kimu ./docs
```

## Add to the application list

```bash
kimu --install-launcher
```

Kimu then appears in your OS's app list with its icon, launching with no folder
→ the landing screen, where you pick a folder. User-level — no sudo/admin. Works
on all three platforms:

- **Linux** — a `.desktop` entry in `~/.local/share/applications` (shows in the
  app menu).
- **macOS** — a `Kimu.app` bundle in `~/Applications` (shows in Launchpad and
  Spotlight).
- **Windows** — a `Kimu.lnk` shortcut in the Start Menu.

Re-run the command after updating Kimu if its install path changes.

> The native folder dialog uses your OS tools: `osascript` (macOS) and
> `powershell` (Windows) are built in; on Linux it needs `zenity` or `kdialog`
> (usually preinstalled on GNOME/KDE). Without one, start Kimu with a folder
> from the terminal instead: `kimu <folder>`.
