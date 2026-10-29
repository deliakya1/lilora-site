// Tell IndexNow engines (Bing, which also feeds ChatGPT search and Copilot, plus
// Yandex, Naver, Seznam and others) which lilora.app URLs exist or changed.
// Run after a merge has been deployed: `node scripts/indexnow.mjs [--since YYYY-MM-DD] [--dry-run]`.
// Google does not use IndexNow; it reads the sitemap index instead.
import { readFileSync, readdirSync } from "node:fs";
import { languages } from './locale-registry.mjs';

const host = "lilora.app";
const keyFile = readdirSync(".").find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
if (!keyFile) throw Error("IndexNow key file missing at the site root");
const key = readFileSync(keyFile, "utf8").trim();
const args = process.argv.slice(2);
const since = args.includes("--since") ? args[args.indexOf("--since") + 1] : "";
const urls = languages.flatMap((l) =>
  [...readFileSync(`sitemap-${l}.xml`, "utf8").matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)]
    .filter(([, , lastmod]) => !since || (lastmod && lastmod >= since))
    .map(([, loc]) => loc),
);
const body = { host, key, keyLocation: `https://${host}/${keyFile}`, urlList: urls };
if (args.includes("--dry-run")) {
  console.log(JSON.stringify({ ...body, urlList: `${urls.length} URLs` }));
} else if (urls.length) {
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  console.log(`IndexNow: ${response.status} for ${urls.length} URLs`);
  if (response.status >= 300) process.exitCode = 1;
}
