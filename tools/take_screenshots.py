#!/usr/bin/env python3
"""Render Emberfall Duel's four screenshot scenes in headless Chromium.

Serves game/ over a local static server, opens each ?shot= scene from
shots.json at a 1280x800 viewport, waits for window.__shotReady, and saves a
JPEG (quality 88) into screenshots/. These are real renders of the game's own
code in a browser, exactly as the bounty requires.
"""
import json
import pathlib
import subprocess
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = json.loads((ROOT / "shots.json").read_text())

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", "8901", "--bind", "127.0.0.1"],
    cwd=ROOT / "game",
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
try:
    for _ in range(50):
        try:
            urllib.request.urlopen("http://127.0.0.1:8901/index.html", timeout=1)
            break
        except Exception:
            time.sleep(0.2)

    from playwright.sync_api import sync_playwright

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--force-color-profile=srgb"])
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        for shot in SHOTS:
            url = f"http://127.0.0.1:8901/index.html{shot['query']}"
            page.goto(url)
            page.wait_for_function("window.__shotReady === true", timeout=30000)
            page.wait_for_timeout(150)
            out = ROOT / "screenshots" / shot["name"]
            page.screenshot(path=str(out), type="jpeg", quality=88)
            print("wrote", out, out.stat().st_size, "bytes")
        browser.close()
        if errors:
            print("PAGE ERRORS:", errors, file=sys.stderr)
            sys.exit(1)
finally:
    server.terminate()
