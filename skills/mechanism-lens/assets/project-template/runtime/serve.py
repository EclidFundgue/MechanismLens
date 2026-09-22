#!/usr/bin/env python3

import argparse
import functools
import http.server
import os
import socketserver
import threading
import webbrowser

parser = argparse.ArgumentParser(description="Serve a built MechanismLens explanation")
parser.add_argument("root", nargs="?", default="site")
parser.add_argument("--port", type=int, default=0)
parser.add_argument("--open", action="store_true")
args = parser.parse_args()

root = os.path.abspath(args.root)
if not os.path.isfile(os.path.join(root, "index.html")):
    raise SystemExit(f"Missing {os.path.join(root, 'index.html')}")

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

with ReusableTCPServer(("127.0.0.1", args.port), handler) as server:
    url = f"http://127.0.0.1:{server.server_address[1]}/"
    print(f"MechanismLens: {url}")
    print("Press Ctrl+C to stop.")
    if args.open:
        threading.Timer(0.2, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
