"""Simple HTTP server với SPA fallback + API proxy.
- Serve từ thư mục public/
- Fallback /menu/:tableId về index.html (SPA routing)
- Proxy /api/* tới deployed Worker URL (vì API chỉ chạy trên Cloudflare)

Cách dùng: python serve.py [port]
"""
import http.client
import http.server
import os
import socketserver
import sys
import urllib.parse

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")
INDEX_FILE = os.path.join(PUBLIC_DIR, "index.html")
WORKER_HOST = "pos-demo.webhook-logger.workers.dev"


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def send_head(self):
        # /api/* → proxy sang Worker
        if self.path.startswith("/api/"):
            return self._proxy_api()
        # File tồn tại → serve thẳng
        path = self.translate_path(self.path)
        if os.path.isfile(path):
            return super().send_head()
        # SPA fallback: serve index.html
        if os.path.isfile(INDEX_FILE):
            self.path = "/index.html"
            return super().send_head()
        return super().send_head()

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self._handle_proxy()
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._handle_proxy()
        return super().do_POST()

    def do_PUT(self):
        if self.path.startswith("/api/"):
            return self._handle_proxy()
        return super().do_PUT()

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            return self._handle_proxy()
        return super().do_DELETE()

    def do_OPTIONS(self):
        # CORS preflight
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def _handle_proxy(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length) if length > 0 else b""
            conn = http.client.HTTPSConnection(WORKER_HOST, timeout=30)
            headers = {k: v for k, v in self.headers.items() if k.lower() not in ("host", "content-length")}
            headers["Host"] = WORKER_HOST
            conn.request(self.command, self.path, body=body, headers=headers)
            resp = conn.getresponse()
            data = resp.read()
            self.send_response(resp.status)
            for k, v in resp.getheaders():
                if k.lower() not in ("transfer-encoding", "connection"):
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(data)
            conn.close()
        except Exception as e:
            self.send_error(502, f"Proxy error: {e}")

    def _proxy_api(self):
        # For HEAD-equivalent via send_head
        return self._handle_proxy() if self.command != "HEAD" else self._handle_proxy()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8788
    with socketserver.ThreadingTCPServer(("", port), SPAHandler) as httpd:
        httpd.allow_reuse_address = True
        print(f"Serving {PUBLIC_DIR} on http://localhost:{port}/")
        print(f"  - Static: GET /")
        print(f"  - SPA fallback: /menu/<id> -> index.html")
        print(f"  - API proxy: /api/* -> https://{WORKER_HOST}/api/*")
        httpd.serve_forever()