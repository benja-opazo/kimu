#!/usr/bin/env python3
"""
Kimu — tiny local markdown doc viewer.
Usage:  kimu [folder] [-p PORT]   (folder default ".", port default 8765)
Opens:  http://localhost:8765

Serves the SPA shell (index.html), static assets (static/), and a small JSON API:
  GET  /api/config            -> {"name": "Kimu", "folder": <basename>}
  GET  /api/files             -> list of doc paths (relative to folder)
  GET  /api/file?path=...     -> raw markdown
  POST /api/file?path=...     -> overwrite markdown
  GET  /api/search?q=...      -> [{path, line, text}] case-insensitive content matches
  POST /api/quit              -> shut the server down (process exits)
"""
import argparse, json, os, shutil, socket, subprocess, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


class HTTPServerQuiet(ThreadingHTTPServer):
    # threaded so the native folder dialog (which blocks its request) doesn't
    # freeze asset/API requests from the page.
    daemon_threads = True

    def handle_error(self, request, client_address):
        if sys.exc_info()[0] is BrokenPipeError:
            pass  # client closed connection before response completed, harmless
        else:
            super().handle_error(request, client_address)


HERE = Path(__file__).resolve().parent           # the kimu package dir
STATIC = HERE / "static"

APP_NAME = "Kimu"

# the folder currently being served; None until one is chosen (landing page)
DOCS = None


def pick_folder_dialog():
    """Open the OS-native folder chooser. Returns (path, error):
    path is the chosen absolute path (or None if cancelled); error is a
    message when no native dialog is available."""
    try:
        if sys.platform == "darwin":
            script = 'POSIX path of (choose folder with prompt "Select a Kimu docs folder")'
            r = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
            return (r.stdout.strip() or None, None)
        if os.name == "nt":
            ps = ("Add-Type -AssemblyName System.Windows.Forms;"
                  "$d=New-Object System.Windows.Forms.FolderBrowserDialog;"
                  "if($d.ShowDialog() -eq 'OK'){[Console]::Out.Write($d.SelectedPath)}")
            r = subprocess.run(["powershell", "-NoProfile", "-Command", ps],
                               capture_output=True, text=True)
            return (r.stdout.strip() or None, None)
        # Linux / other Unix: native dialog via zenity or kdialog
        if not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
            return (None, "No graphical display available. "
                          "Start Kimu with a folder instead: kimu <folder>")
        if shutil.which("zenity"):
            r = subprocess.run(["zenity", "--file-selection", "--directory",
                                "--title=Select a Kimu docs folder"],
                               capture_output=True, text=True)
            return (r.stdout.strip() or None, None)
        if shutil.which("kdialog"):
            r = subprocess.run(["kdialog", "--getexistingdirectory", str(Path.home())],
                               capture_output=True, text=True)
            return (r.stdout.strip() or None, None)
        return (None, "No native folder dialog found. Install 'zenity' or 'kdialog', "
                      "or start Kimu with a folder: kimu <folder>")
    except Exception as e:
        return (None, f"Could not open folder dialog: {e}")

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
}
SEARCH_LIMIT = 200


def local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def safe(rel: str) -> Path | None:
    """Resolve rel under DOCS; return Path only if it's an existing .md file."""
    try:
        p = (DOCS / rel).resolve()
        p.relative_to(DOCS)                    # raises if outside docs/
        return p if p.suffix == ".md" and p.is_file() else None
    except Exception:
        return None


def static_file(rel: str) -> Path | None:
    """Resolve rel under static/; return Path only if it's an existing file."""
    try:
        p = (STATIC / rel).resolve()
        p.relative_to(STATIC)
        return p if p.is_file() else None
    except Exception:
        return None


def doc_paths() -> list[Path]:
    if DOCS is None:
        return []
    out = []
    for p in sorted(DOCS.rglob("*.md")):
        try:
            p.relative_to(HERE)                # skip viewer/ itself
            continue
        except ValueError:
            out.append(p)
    return out


def file_tree() -> list[str]:
    return [str(p.relative_to(DOCS)) for p in doc_paths()]


def search_docs(q: str) -> list[dict]:
    q = q.strip().lower()
    if len(q) < 2:
        return []
    out = []
    for p in doc_paths():
        try:
            lines = p.read_text(encoding="utf-8").split("\n")
        except Exception:
            continue
        rel = str(p.relative_to(DOCS))
        for i, line in enumerate(lines):
            if q in line.lower():
                out.append({"path": rel, "line": i + 1, "text": line.strip()[:200]})
                if len(out) >= SEARCH_LIMIT:
                    return out
    return out


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        u = urlparse(self.path)
        if u.path in ("/", "/index.html"):
            self._file(HERE / "index.html", CONTENT_TYPES[".html"])
        elif u.path.startswith("/static/"):
            p = static_file(u.path[len("/static/"):])
            if p:
                self._file(p, CONTENT_TYPES.get(p.suffix, "application/octet-stream"))
            else:
                self.send_error(404)
        elif u.path == "/api/config":
            self._json({"name": APP_NAME, "folder": DOCS.name if DOCS else None})
        elif u.path == "/api/files":
            self._json(file_tree())
        elif u.path == "/api/search":
            q = parse_qs(u.query).get("q", [""])[0]
            self._json(search_docs(q))
        elif u.path == "/api/file":
            rel = parse_qs(u.query).get("path", [""])[0]
            p = safe(rel)
            if p:
                self._file(p, "text/plain; charset=utf-8")
            else:
                self.send_error(404)
        else:
            self.send_error(404)

    def do_POST(self):
        global DOCS
        u = urlparse(self.path)
        if u.path == "/api/quit":
            self._json({"ok": True})
            # shutdown() must run off the serve_forever thread, so spawn one.
            import threading
            threading.Thread(target=self.server.shutdown, daemon=True).start()
            return
        if u.path == "/api/pick-folder":
            path, err = pick_folder_dialog()
            if err:
                return self._json({"error": err})
            if path and Path(path).is_dir():
                DOCS = Path(path).resolve()
                return self._json({"folder": DOCS.name, "path": str(DOCS)})
            return self._json({"folder": None})        # cancelled
        if u.path != "/api/file":
            return self.send_error(404)
        rel = parse_qs(u.query).get("path", [""])[0]
        p = safe(rel)
        if not p:
            return self.send_error(403)
        n = int(self.headers.get("Content-Length", 0))
        p.write_text(self.rfile.read(n).decode("utf-8"), encoding="utf-8")
        self._json({"ok": True})

    def _file(self, p: Path, ct: str):
        data = p.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ct)
        self.send_header("Content-Length", len(data))
        self.end_headers()
        self.wfile.write(data)

    def _json(self, obj):
        data = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", CONTENT_TYPES[".json"])
        self.send_header("Content-Length", len(data))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_):
        pass  # suppress per-request noise


def serve(folder=None, port=8765):
    """Create (but do not start) an HTTP server, returning the httpd.

    `folder` may be None to start with no folder open (the landing page); the
    user then picks one from the UI. Raises NotADirectoryError if a given
    folder is invalid.
    """
    global DOCS
    if folder is None:
        DOCS = None
    else:
        docs = Path(folder).resolve()
        if not docs.is_dir():
            raise NotADirectoryError(folder)
        DOCS = docs
    return HTTPServerQuiet(("0.0.0.0", port), Handler)


def main():
    parser = argparse.ArgumentParser(prog="kimu", description="Kimu — local markdown doc viewer")
    parser.add_argument("folder", nargs="?", default=None,
                        help="folder of .md docs to serve (omit to open the landing screen)")
    parser.add_argument("-p", "--port", type=int, default=8765,
                        help="port to listen on (default: 8765)")
    parser.add_argument("--no-browser", action="store_true",
                        help="don't open a browser window on start")
    parser.add_argument("--install-launcher", action="store_true",
                        help="add Kimu to the OS app list (Linux/macOS/Windows) and exit")
    args = parser.parse_args()

    if args.install_launcher:
        from .launcher import install_launcher
        install_launcher()
        return

    try:
        httpd = serve(args.folder, args.port)
    except NotADirectoryError:
        print(f"kimu: '{args.folder}' is not a directory", file=sys.stderr)
        sys.exit(1)

    url = f"http://localhost:{args.port}"
    print(f"  Folder:  {DOCS if DOCS else '(none — choose one in the browser)'}")
    print(f"  Local:   {url}")
    print(f"  Network: http://{local_ip()}:{args.port}")
    print("  Ctrl+C to stop")

    if not args.no_browser:
        import threading, webbrowser
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()

    try:
        httpd.serve_forever()      # returns when /api/quit calls shutdown()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
    print("kimu: stopped.")


if __name__ == "__main__":
    main()
