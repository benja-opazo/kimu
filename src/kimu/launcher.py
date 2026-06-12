"""Install a desktop launcher so Kimu shows up in the OS application list.

User-level only — no sudo/admin. Works on Linux (.desktop entry), macOS
(an .app bundle in ~/Applications) and Windows (a Start Menu shortcut). Uses
only the standard library plus tools already built into each OS.
"""
import os
import shutil
import struct
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ICON_256 = HERE / "static" / "icons" / "kimu-256.png"
ICON_128 = HERE / "static" / "icons" / "kimu-128.png"


def _executable() -> str:
    """Best-effort path to the kimu launcher (no folder -> landing screen)."""
    exe = shutil.which("kimu")
    if exe:
        return exe
    sibling = Path(sys.argv[0]).resolve().parent / "kimu"
    if sibling.exists():
        return str(sibling)
    return f"{sys.executable} -m kimu"


def install_launcher():
    if sys.platform.startswith("linux"):
        _install_linux()
    elif sys.platform == "darwin":
        _install_macos()
    elif os.name == "nt":
        _install_windows()
    else:
        print(f"kimu: no launcher support for platform '{sys.platform}'. "
              "Run 'kimu' directly.", file=sys.stderr)


# --- Linux: XDG .desktop entry ------------------------------------------------

DESKTOP_ENTRY = """[Desktop Entry]
Type=Application
Name=Kimu
Comment=Local markdown doc viewer
Exec={exec}
Icon={icon}
Terminal=true
Categories=Utility;Office;Viewer;
"""


def _install_linux():
    data = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    apps = data / "applications"
    icons = data / "icons" / "hicolor" / "256x256" / "apps"
    apps.mkdir(parents=True, exist_ok=True)
    icons.mkdir(parents=True, exist_ok=True)

    # Install into the hicolor theme (the conventional spot) and also reference
    # it by absolute path below, so the icon shows even without a theme cache.
    icon_path = icons / "kimu.png"
    if ICON_256.exists():
        shutil.copyfile(ICON_256, icon_path)
        icon = str(icon_path)
    else:
        icon = "kimu"

    desktop = apps / "kimu.desktop"
    desktop.write_text(DESKTOP_ENTRY.format(exec=_executable(), icon=icon),
                       encoding="utf-8")
    os.chmod(desktop, 0o755)

    db = shutil.which("update-desktop-database")
    if db:
        os.system(f'"{db}" "{apps}" >/dev/null 2>&1')
    cache = shutil.which("gtk-update-icon-cache")
    if cache:
        hicolor = data / "icons" / "hicolor"
        os.system(f'"{cache}" -f -t "{hicolor}" >/dev/null 2>&1')

    print(f"Installed launcher: {desktop}")
    print("Kimu should now appear in your application menu.")


# --- macOS: .app bundle in ~/Applications ------------------------------------

INFO_PLIST = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Kimu</string>
  <key>CFBundleDisplayName</key><string>Kimu</string>
  <key>CFBundleIdentifier</key><string>com.kimu.viewer</string>
  <key>CFBundleVersion</key><string>0.1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>kimu</string>
  <key>CFBundleIconFile</key><string>kimu</string>
</dict>
</plist>
"""


def _install_macos():
    app = Path.home() / "Applications" / "Kimu.app"
    macos = app / "Contents" / "MacOS"
    resources = app / "Contents" / "Resources"
    macos.mkdir(parents=True, exist_ok=True)
    resources.mkdir(parents=True, exist_ok=True)

    (app / "Contents" / "Info.plist").write_text(INFO_PLIST, encoding="utf-8")

    # The bundle executable just launches the kimu command (no folder ->
    # landing screen, where the user picks a folder).
    launcher = macos / "kimu"
    launcher.write_text(f'#!/bin/sh\nexec {_executable()}\n', encoding="utf-8")
    os.chmod(launcher, 0o755)

    if _make_icns(resources / "kimu.icns"):
        icon_note = ""
    else:
        icon_note = " (without a custom icon — iconutil/sips unavailable)"

    print(f"Installed app bundle: {app}{icon_note}")
    print("Kimu should now appear in Launchpad and Spotlight.")


def _make_icns(dest: Path) -> bool:
    """Build a .icns from the bundled PNGs using macOS's iconutil. Best-effort."""
    iconutil = shutil.which("iconutil")
    if not (iconutil and ICON_256.exists()):
        return False
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        iconset = Path(tmp) / "kimu.iconset"
        iconset.mkdir()
        # iconutil keys icons by these exact names.
        if ICON_128.exists():
            shutil.copyfile(ICON_128, iconset / "icon_128x128.png")
        shutil.copyfile(ICON_256, iconset / "icon_256x256.png")
        shutil.copyfile(ICON_256, iconset / "icon_128x128@2x.png")
        try:
            subprocess.run([iconutil, "-c", "icns", str(iconset), "-o", str(dest)],
                           check=True, capture_output=True)
            return True
        except (subprocess.CalledProcessError, OSError):
            return False


# --- Windows: Start Menu shortcut --------------------------------------------

def _install_windows():
    appdata = os.environ.get("APPDATA")
    if not appdata:
        print("kimu: %APPDATA% not set; cannot locate the Start Menu.", file=sys.stderr)
        return
    programs = Path(appdata) / "Microsoft" / "Windows" / "Start Menu" / "Programs"
    programs.mkdir(parents=True, exist_ok=True)
    shortcut = programs / "Kimu.lnk"

    exe = shutil.which("kimu") or shutil.which("kimu.exe")
    if exe:
        target, arguments = exe, ""
    else:
        # Fall back to launching the module via pythonw (no console window).
        target = str(Path(sys.executable).with_name("pythonw.exe"))
        if not Path(target).exists():
            target = sys.executable
        arguments = "-m kimu"

    icon = Path(appdata) / "kimu" / "kimu.ico"
    icon.parent.mkdir(parents=True, exist_ok=True)
    has_icon = _make_ico(icon)

    ps = (
        "$ws = New-Object -ComObject WScript.Shell; "
        f"$s = $ws.CreateShortcut('{shortcut}'); "
        f"$s.TargetPath = '{target}'; "
        f"$s.Arguments = '{arguments}'; "
        "$s.Description = 'Local markdown doc viewer'; "
        + (f"$s.IconLocation = '{icon}'; " if has_icon else "")
        + "$s.Save()"
    )
    try:
        subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps],
                       check=True, capture_output=True)
    except (subprocess.CalledProcessError, OSError) as e:
        print(f"kimu: failed to create Start Menu shortcut: {e}", file=sys.stderr)
        return

    print(f"Installed Start Menu shortcut: {shortcut}")
    print("Kimu should now appear in the Start Menu.")


def _make_ico(dest: Path) -> bool:
    """Wrap the 256px PNG in a single-image .ico (Windows accepts PNG payloads)."""
    if not ICON_256.exists():
        return False
    png = ICON_256.read_bytes()
    # ICONDIR header + one ICONDIRENTRY pointing at the embedded PNG.
    # width/height byte 0 == 256px.
    header = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack("<BBBBHHII", 0, 0, 0, 0, 1, 32, len(png), 22)
    dest.write_bytes(header + entry + png)
    return True
