"""Install a desktop launcher so Kimu shows up in the Linux application menu.

User-level only (~/.local/share) — no sudo. On macOS/Windows this is a no-op
with a hint to run `kimu` directly.
"""
import os
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ICON_SRC = HERE / "static" / "icons" / "kimu-256.png"

DESKTOP_ENTRY = """[Desktop Entry]
Type=Application
Name=Kimu
Comment=Local markdown doc viewer
Exec={exec}
Icon=kimu
Terminal=false
Categories=Utility;Office;Viewer;
"""


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
    if not sys.platform.startswith("linux"):
        print("kimu: --install-launcher is Linux-only. "
              "On macOS/Windows, run 'kimu' directly.", file=sys.stderr)
        return

    data = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    apps = data / "applications"
    icons = data / "icons" / "hicolor" / "256x256" / "apps"
    apps.mkdir(parents=True, exist_ok=True)
    icons.mkdir(parents=True, exist_ok=True)

    if ICON_SRC.exists():
        shutil.copyfile(ICON_SRC, icons / "kimu.png")

    desktop = apps / "kimu.desktop"
    desktop.write_text(DESKTOP_ENTRY.format(exec=_executable()), encoding="utf-8")
    os.chmod(desktop, 0o755)

    db = shutil.which("update-desktop-database")
    if db:
        os.system(f'"{db}" "{apps}" >/dev/null 2>&1')

    print(f"Installed launcher: {desktop}")
    print("Kimu should now appear in your application menu.")
