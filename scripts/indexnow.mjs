// Pings IndexNow (Bing, Yandex and others) with every URL in the live
// sitemap. Run by hand after a deploy: `npm run indexnow`.
// The key file in public/<key>.txt is public by design; the key is the
// file's name and contents.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://www.airoomredo.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const keyFile = readdirSync(publicDir).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("No IndexNow key file (public/<32 hex>.txt) found.");
  process.exit(1);
}
const key = readFileSync(join(publicDir, keyFile), "utf8").trim();
const host = new URL(SITE_URL).host;

const sitemapRes = await fetch(`${SITE_URL}/sitemap.xml`);
if (!sitemapRes.ok) {
  console.error(`Could not fetch sitemap: HTTP ${sitemapRes.status}`);
  process.exit(1);
}
const xml = await sitemapRes.text();
const urlList = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
if (urlList.length === 0) {
  console.error("No URLs found in sitemap.xml.");
  process.exit(1);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host,
    key,
    keyLocation: `${SITE_URL}/${keyFile}`,
    urlList,
  }),
});
console.log(`IndexNow: submitted ${urlList.length} URLs, status ${res.status} ${res.statusText}`);
if (res.status !== 200 && res.status !== 202) process.exit(1);
