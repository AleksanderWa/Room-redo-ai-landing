# Mobile QA helper

Phone-width checks with Playwright (Python), because the Chrome extension tools can't emulate a phone viewport or touch.

Requires `playwright` for Python and its Chromium (`pip install playwright && playwright install chromium`). It is deliberately not in `package.json`.

## Run it

```bash
# 1. Build and serve locally on your own port (pick one nobody else uses)
npm ci && npm run build
npx next start -p 3104 & echo $! > /tmp/qa-3104.pid

# 2. Check pages (375x812 iPhone X-class and 390x844 iPhone 12-14-class, DPR 3, touch, iPhone UA)
python3 scripts/qa/mobile.py http://localhost:3104/ --out qa-out
python3 scripts/qa/mobile.py http://localhost:3104/guides/ai-room-design-free --widths 375 --capture-events

# 3. Stop only your own server
kill "$(cat /tmp/qa-3104.pid)"
```

If `npx` forks a child, check `lsof -ti tcp:3104` and kill that PID. Never `pkill`: other sessions run servers too.

Only widths 375 and 390 are supported (`open_phone` raises `ValueError` otherwise).

Output is a JSON summary on stdout (exit code 1 if overflow, console errors or failed requests) and per-width screenshots in `--out`: `<slug>-<width>-first.png` (first screen) and `-full.png`.

The `/_vercel/insights/script.js` 404 is expected on a local `next start` and is filtered out.

## Gotchas

- **Vercel previews are auth-gated.** Test a local build, or a production URL. Previews need a login or bypass token.
- **PostHog drops events in headless mode and when `navigator.webdriver` is true.** `--capture-events` (or `capture_events=True`) runs headed and overrides webdriver. A window will appear. Events only exist if the build had `NEXT_PUBLIC_POSTHOG_KEY` set (analytics is off otherwise); for a local build use `NEXT_PUBLIC_POSTHOG_KEY=phc_dummy npm run build` (the /ingest 401/404s from a fake key then show up in failed requests). `/ingest` bodies are usually plain JSON `{batch:[...]}`; the helper also handles gzip and form-encoded `data=<base64>` bodies, and silently ignores anything it can't decode.
- `tap()` only taps. Real drags and swipes go through CDP `Input.dispatchTouchEvent` (`touch_drag`, `swipe_vertical`).

## Custom checks

Example: touch-drag the homepage hero before/after slider and assert it moves. (A style-chip example can be added once PR #12 merges.)

```python
import sys; sys.path.insert(0, "scripts/qa")
from mobile import open_phone, close_phone, touch_drag, no_hscroll

page, ctx, _ = open_phone(375)
try:
    page.goto("http://localhost:3104/", wait_until="networkidle")
    handle = page.locator(".rr-phone [role=slider]")
    handle.scroll_into_view_if_needed()
    before = int(handle.get_attribute("aria-valuenow"))

    box = page.locator(".rr-phone-screen").bounding_box()
    y = box["y"] + box["height"] * .5
    touch_drag(page, box["x"] + box["width"] * .5, y, box["x"] + box["width"] * .2, y)  # drag left

    after = int(handle.get_attribute("aria-valuenow"))
    assert after < before, (before, after)
    assert no_hscroll(page) and not page.errs
    print("slider", before, "->", after)
finally:
    close_phone(ctx)
```
