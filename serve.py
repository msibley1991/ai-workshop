# Local dev server: python3 serve.py [port]. Like `python3 -m http.server`, but
# tells the browser not to cache, so edits (CSS, JS, presets) show on reload, and
# lets the dial panels' save buttons write presets/<name>.json (PUT, from this
# machine only). The published site is static and never writes.
import json
import re
import sys
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
PRESET_URL = re.compile(r"^/presets/([a-z0-9-]+)\.json$")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_PUT(self):
        match = PRESET_URL.match(self.path)
        if not match:
            return self.send_error(404, "Only presets can be saved")
        if self.client_address[0] not in ("127.0.0.1", "::1", "::ffff:127.0.0.1"):
            return self.send_error(403, "Presets can only be saved from this machine")
        try:
            length = int(self.headers.get("Content-Length", 0))
            values = json.loads(self.rfile.read(length))
            if not isinstance(values, dict):
                raise ValueError("expected a JSON object")
        except ValueError as err:
            return self.send_error(400, f"Bad preset JSON: {err}")
        path = ROOT / "presets" / f"{match.group(1)}.json"
        path.write_text(json.dumps(values, indent=2) + "\n")
        self.send_response(204)
        self.end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
ThreadingHTTPServer(("", port), Handler).serve_forever()
