# Local preview server for the game: serves public/ and tells the browser not to cache,
# so every reload picks up the latest code. Run: python3 serve.py  (then open http://localhost:8000)
import functools
import http.server

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

handler = functools.partial(NoCache, directory='public')
http.server.ThreadingHTTPServer(('', 8000), handler).serve_forever()
