#!/usr/bin/env python3
"""Phone-width QA helper (Playwright, Python). See README.md.

CLI:  python3 scripts/qa/mobile.py <url> [--widths 375,390] [--out DIR] [--headed] [--capture-events]
Import: from mobile import open_phone, touch_drag, swipe_vertical, tap, no_hscroll, events, close_phone
"""
import argparse, base64, gzip, json, sys, time, urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright

UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
HEIGHTS = {375: 812, 390: 844}
# Expected on a local `next start`; not a real failure.
NOISE = ("/_vercel/insights/script.js", "/_vercel/speed-insights/script.js")

_EVENTS = []  # decoded PostHog events from the most recent open_phone(capture_events=True)


def _decode(buf):
    """PostHog /ingest bodies are plain JSON; fall back to gzip / base64 / data= form."""
    if not buf:
        return None
    cands = [buf]
    try:
        cands.append(gzip.decompress(buf))
    except Exception:
        pass
    for c in list(cands):
        s = c.decode("utf8", "ignore")
        if s.startswith("data="):
            try:
                cands.append(base64.b64decode(urllib.parse.parse_qs(s)["data"][0]))
            except Exception:
                pass
    for c in cands:
        try:
            return json.loads(c)
        except Exception:
            pass
    return None


def _is_noise(url):
    return any(n in url for n in NOISE)


def open_phone(width=375, headed=False, capture_events=False):
    """Open an iPhone-profile page. Returns (page, context, events).

    page.errs / page.failed collect console errors and failed requests (noise filtered).
    events is a live list of decoded PostHog events when capture_events is set.
    Call close_phone(context) when done.
    """
    height = HEIGHTS.get(width, 844)
    # PostHog drops events in headless mode and when navigator.webdriver is true.
    headed = headed or capture_events
    pw = sync_playwright().start()
    browser = pw.chromium.launch(headless=not headed)
    ctx = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=3,
                              is_mobile=True, has_touch=True, user_agent=UA)
    ctx._pw, ctx._browser = pw, browser
    if capture_events:
        ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>false})")
    page = ctx.new_page()
    page.errs, page.failed = [], []
    page.on("console", lambda m: page.errs.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
    page.on("pageerror", lambda e: page.errs.append(f"pageerror: {e}"))
    page.on("requestfailed", lambda r: page.failed.append({"url": r.url, "reason": r.failure}) if not _is_noise(r.url) else None)
    page.on("response", lambda r: page.failed.append({"url": r.url, "status": r.status}) if r.status >= 400 and not _is_noise(r.url) else None)
    _EVENTS.clear()
    if capture_events:
        def on_req(r):
            if "/ingest" in r.url and r.method == "POST":
                try:
                    body = _decode(r.post_data_buffer)
                except Exception:
                    return
                items = body.get("batch", [body]) if isinstance(body, dict) else (body or [])
                _EVENTS.extend(e for e in items if isinstance(e, dict) and "event" in e)
        page.on("request", on_req)
    return page, ctx, _EVENTS


def close_phone(ctx):
    ctx.close()
    ctx._browser.close()
    ctx._pw.stop()


def _touch(page, kind, pts):
    cdp = getattr(page, "_cdp", None) or page.context.new_cdp_session(page)
    page._cdp = cdp
    cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": pts})


def touch_drag(page, x0, y0, x1, y1, steps=10):
    """Real touch drag via CDP (tap() can't drag)."""
    _touch(page, "touchStart", [{"x": x0, "y": y0}])
    for i in range(1, steps + 1):
        _touch(page, "touchMove", [{"x": x0 + (x1 - x0) * i / steps, "y": y0 + (y1 - y0) * i / steps}])
        time.sleep(0.016)
    _touch(page, "touchEnd", [])
    time.sleep(0.3)


def swipe_vertical(page, x, y, dy):
    """Finger swipe by dy px (negative = finger up = page scrolls down)."""
    touch_drag(page, x, y, x, y + dy, steps=12)
    time.sleep(0.4)


def tap(page, selector):
    page.locator(selector).first.tap()


def no_hscroll(page):
    """True when the page has no horizontal overflow."""
    return page.evaluate("document.documentElement.scrollWidth <= innerWidth")


def events(name, evts=None):
    """Captured PostHog events with this name (from the last open_phone)."""
    return [e for e in (_EVENTS if evts is None else evts) if e.get("event") == name]


def check_url(url, widths, out, headed, capture):
    slug = urllib.parse.urlparse(url).path.strip("/").replace("/", "_") or "home"
    results = []
    for w in widths:
        page, ctx, evs = open_phone(w, headed, capture)
        try:
            page.goto(url, wait_until="networkidle")
            time.sleep(1)
            sw, iw = page.evaluate("[document.documentElement.scrollWidth, innerWidth]")
            first, full = out / f"{slug}-{w}-first.png", out / f"{slug}-{w}-full.png"
            page.screenshot(path=str(first))
            page.screenshot(path=str(full), full_page=True)
            if capture:
                time.sleep(2)  # let the PostHog batch flush
            r = {"width": w, "no_hscroll": sw <= iw, "scrollWidth": sw, "innerWidth": iw,
                 "console_errors": page.errs, "failed_requests": page.failed,
                 "screenshots": [str(first), str(full)]}
            if capture:
                r["events"] = [{"event": e["event"], "properties": {k: v for k, v in e.get("properties", {}).items() if not k.startswith("$")}} for e in evs]
            results.append(r)
        finally:
            close_phone(ctx)
    return {"url": url, "results": results,
            "ok": all(r["no_hscroll"] and not r["console_errors"] and not r["failed_requests"] for r in results)}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("url")
    ap.add_argument("--widths", default="375,390")
    ap.add_argument("--out", default="qa-out")
    ap.add_argument("--headed", action="store_true")
    ap.add_argument("--capture-events", action="store_true", help="decode PostHog /ingest events (forces headed)")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    summary = check_url(a.url, [int(w) for w in a.widths.split(",")], out, a.headed, a.capture_events)
    print(json.dumps(summary, indent=2))
    sys.exit(0 if summary["ok"] else 1)


if __name__ == "__main__":
    main()
