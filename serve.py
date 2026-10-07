# Local preview server for the game: serves public/ and tells the browser not to cache,
# so every reload picks up the latest code. Run: python3 serve.py  (then open http://localhost:8000)
#
# Dev-only extra: POST /__save/<name>.png with an image data-URL saves it to 'Marketing Materials/'
# (used by the promo capture tools in ?debug mode; never part of the live site).
import base64
import functools
import http.server
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
PROMO_DIR = os.path.join(ROOT, 'Marketing Materials')


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        match = re.fullmatch(r'/__save/([A-Za-z0-9_-]+\.(?:png|jpg))', self.path)
        if not match:
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get('Content-Length', 0))).decode('ascii')
        data = base64.b64decode(body.split(',', 1)[-1])
        os.makedirs(PROMO_DIR, exist_ok=True)
        with open(os.path.join(PROMO_DIR, match.group(1)), 'wb') as f:
            f.write(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'saved')


handler = functools.partial(NoCache, directory=os.path.join(ROOT, 'public'))
http.server.ThreadingHTTPServer(('', 8000), handler).serve_forever()
