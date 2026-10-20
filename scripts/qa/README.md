# Mobile QA helper

Phone-width checks with Playwright (Python), because the Chrome extension tools can't emulate a phone viewport or touch.

Requires `playwright` for Python and its Chromium (`pip install playwright && playwright install chromium`). It is deliberately not in `package.json`.

## Run it

```bash
# 1. Build and serve locally on your own port (pick one nobody else uses)
npm ci && npm run build
npx next start -p 3104 & echo $! > /tmp/qa-3104.pid

# 2. Check pages (375x812 and 390x844, DPR 3, touch, iPhone UA)
python3 scripts/qa/mobile.py http://localhost:3104/ --out qa-out
python3 scripts/qa/mobile.py http://localhost:3104/guides/ai-room-design-free --widths 375 --capture-events

# 3. Stop only your own server
kill "$(cat /tmp/qa-3104.pid)"
```

If `npx` forks a child, check `lsof -ti tcp:3104` and kill that PID. Never `pkill`: other sessions run servers too.

Output is a JSON summary on stdout (exit code 1 if overflow, console errors or failed requests) and per-width screenshots in `--out`: `<slug>-<width>-first.png` (first screen) and `-full.png`.

The `/_vercel/insights/script.js` 404 is expected on a local `next start` and is filtered out.

## Gotchas

- **Vercel previews are auth-gated.** Test a local build, or a production URL. Previews need a login or bypass token.
- **PostHog drops events in headless mode and when `navigator.webdriver` is true.** `--capture-events` (or `capture_events=True`) runs headed and overrides webdriver. A window will appear. Events only exist if the build had `NEXT_PUBLIC_POSTHOG_KEY` set (analytics is off otherwise); for a local build use `NEXT_PUBLIC_POSTHOG_KEY=phc_dummy npm run build` (the /ingest 401/404s from a fake key then show up in failed requests). `/ingest` bodies are plain JSON `{batch:[...]}`.
- `tap()` only taps. Real drags and swipes go through CDP `Input.dispatchTouchEvent` (`touch_drag`, `swipe_vertical`).

## Custom checks

```python
import sys; sys.path.insert(0, "scripts/qa")
from mobile import open_phone, close_phone, tap, touch_drag, swipe_vertical, no_hscroll, events

page, ctx, evs = open_phone(375, capture_events=True)
page.goto("http://localhost:3104/guides/ai-room-design-free", wait_until="networkidle")

fig = page.locator("figure.rr-article-ba").filter(has=page.locator(".rr-article-ba-chips")).first
fig.scroll_into_view_if_needed()
chips = fig.locator(".rr-article-ba-chip")

heights = [chips.nth(i).bounding_box()["height"] for i in range(chips.count())]
assert all(h >= 44 for h in heights), heights          # tap targets
tap(page, ".rr-article-ba-chip:nth-child(2)")
assert chips.nth(1).get_attribute("aria-checked") == "true"

fb = fig.locator(".rr-article-ba-frame").bounding_box()  # drag the divider
touch_drag(page, fb["x"] + fb["width"] * .5, fb["y"] + fb["height"] * .4,
           fb["x"] + fb["width"] * .3, fb["y"] + fb["height"] * .4)

import time; time.sleep(2)                               # let PostHog flush
assert events("article_style_chip_click"), "no chip events"
assert no_hscroll(page) and not page.errs
close_phone(ctx)
```
