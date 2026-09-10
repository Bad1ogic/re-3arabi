const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ar,en-US;q=0.8,en;q=0.5"
};

function buildInit(options) {
  const init = {
    headers: Object.assign({}, HEADERS, options.headers || {}),
    skipSizeCheck: true
  };
  if (options.method) init.method = options.method;
  if (options.body) init.body = options.body;
  return init;
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, buildInit(options));
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
  return await res.text();
}

async function fetchBuffer(url, options = {}) {
  const res = await fetch(url, buildInit(options));
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
  return await res.arrayBuffer();
}

async function fetchJson(url, options = {}) {
  const raw = await fetchText(url, options);
  return JSON.parse(raw);
}

function absoluteUrl(base, url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return "https:" + url;
  return base.replace(/\/+$/, "") + "/" + url.replace(/^\/+/, "");
}

module.exports = { HEADERS, fetchText, fetchBuffer, fetchJson, absoluteUrl };