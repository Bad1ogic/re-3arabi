const { fetchText, absoluteUrl } = require("./http.js");

const DIRECT_VIDEO = /\.(m3u8|mp4|mkv|webm|avi)(\?.*)?$/i;
const M3U8_RE = /https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/gi;
const MP4_RE = /https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/gi;

function cleanStreamUrl(raw) {
  return String(raw)
    .replace(/\\\//g, "/")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/&amp;/g, "&")
    .trim();
}

function stripUrls(raw) {
  return String(raw)
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&");
}

function unescapeJsString(str) {
  return String(str).replace(/\\(?:x([0-9a-fA-F]{2})|[\\'"nrt])/g, (m, h) => {
    if (h) return String.fromCharCode(parseInt(h, 16));
    if (m === "\\'") return "'";
    if (m === '\\"') return '"';
    if (m === "\\\\") return "\\";
    return m === "\\n" ? "\n" : m === "\\r" ? "\r" : "\t";
  });
}

function unpackPacked(text) {
  const regex = /\}\((['"])([\s\S]*?)\1,(\d+),(\d+),(['"])([\s\S]*?)\5/;
  const match = regex.exec(String(text));
  if (!match) return text;
  const [, , payload, baseStr, countStr, , namesRaw] = match;
  const base = parseInt(baseStr, 10);
  const count = parseInt(countStr, 10);
  const names = unescapeJsString(namesRaw)
    .split("|")
    .map((n) => unescapeJsString(n));
  let out = unescapeJsString(payload);
  for (let i = count - 1; i >= 0; i--) {
    const word = names[i];
    if (word) {
      out = out.replace(new RegExp("\\b" + i.toString(base) + "\\b", "g"), word);
    }
  }
  return out;
}

function extractMediaUrls(raw) {
  const text = stripUrls(raw);
  const out = [];
  const seen = new Set();

  function push(url, quality) {
    url = cleanStreamUrl(url);
    if (!url) return;
    if (!/^https?:\/\//.test(url)) {
      if (!url.startsWith("//")) return;
      url = "https:" + url;
    }
    if (seen.has(url)) return;
    seen.add(url);
    out.push({ url, quality: quality || "auto" });
  }

  if (M3U8_RE.test(text)) {
    M3U8_RE.lastIndex = 0;
    let m;
    while ((m = M3U8_RE.exec(text)) !== null) {
      push(m[0], "auto");
    }
  }
  if (MP4_RE.test(text)) {
    MP4_RE.lastIndex = 0;
    let m;
    while ((m = MP4_RE.exec(text)) !== null) {
      push(m[0], "auto");
    }
  }
  const sourceRe = /(?:source|src|file|url)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mkv|webm|avi)[^"']*)["']/gi;
  let m;
  while ((m = sourceRe.exec(text)) !== null) {
    push(m[1], "auto");
  }
  return out;
}

function toStream(providerName, title, url, quality, headers) {
  return { provider: providerName, name: providerName, title: title || providerName, url, quality: quality || "auto", headers: headers || {} };
}

async function extractDailymotion(url, headers) {
  const idMatch = url.match(/\/video\/([a-zA-Z0-9]+)/);
  if (!idMatch) return [];
  const id = idMatch[1];
  const streams = [];
  try {
    const videoPageUrl = `https://www.dailymotion.com/video/${id}`;
    const meta = await fetchText(
      `https://www.dailymotion.com/player/metadata/video/${id}?embedder=${encodeURIComponent(videoPageUrl)}&fields=qualities,stream_hls_url`,
      { headers: { Referer: videoPageUrl + "?syndication=273805", Accept: "application/json" } }
    );
    const json = JSON.parse(meta);
    if (json.error) return [];
    const qualities = json.qualities || {};
    const keys = Object.keys(qualities).sort((x, y) => {
      const nx = parseInt(x, 10) || 0;
      const ny = parseInt(y, 10) || 0;
      return ny - nx;
    });
    for (const key of keys) {
      const entries = qualities[key];
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        const u = entry && entry.url;
        if (!u) continue;
        if (/geo/i.test((entry.type || "") + u)) continue;
        streams.push(toStream("Dailymotion", "Dailymotion " + (key === "auto" ? "Auto" : key + "p"), u, key === "auto" ? "auto" : key, headers));
      }
    }
    if (streams.length === 0 && json.stream_hls_url) {
      streams.push(toStream("Dailymotion", "Dailymotion", json.stream_hls_url, "auto", headers));
    }
  } catch (e) {
    return [];
  }
  return streams;
}

// ---- cipher functions (SmartPlayer style AES/CBC) -------------------------

function bufToWords(buf) {
  const words = [];
  for (let i = 0; i < buf.length; i += 1) {
    words.push(buf[i]);
  }
  return words;
}

function wordsToBuf(words) {
  const buf = [];
  for (const w of words) {
    buf.push(w & 0xff);
  }
  return buf;
}

function padHex(hex) {
  let h = String(hex || "").trim().replace(/"/g, "");
  if (h.length % 2 !== 0) h = h.slice(0, -1);
  return h;
}

function hexToBytes(hex) {
  const h = padHex(hex);
  const out = [];
  for (let i = 0; i < h.length; i += 2) {
    out.push(parseInt(h.substr(i, 2), 16) & 0xff);
  }
  return out;
}

// ---- SmartPlayer (Tuniflix / LodyNet style) -------------------------------

const SP_KEY = "kiemtienmua911ca";
const SP_KEY_WORDS = [];
for (let i = 0; i < SP_KEY.length; i++) SP_KEY_WORDS.push(SP_KEY.charCodeAt(i));
while (SP_KEY_WORDS.length % 16 !== 0) SP_KEY_WORDS.push(0);

function generateIvCandidates(domain, videoId) {
  const candidates = [];
  const dOpts = [48, 323];
  if (domain) {
    dOpts.push(domain.length * (domain.length + 2));
    const parts = domain.split(".");
    if (parts.length >= 2) {
      const shortDomain = parts[parts.length - 2] + "." + parts[parts.length - 1];
      dOpts.push(shortDomain.length * (shortDomain.length + 2));
    }
  }
  const wOpts = [0, 105, 141, 189, 63];
  if (videoId) {
    wOpts.push(3 * videoId.charCodeAt(0));
  }
  for (const d of [...new Set(dOpts)]) {
    for (const w of [...new Set(wOpts)]) {
      let part1 = "";
      for (let i = 1; i <= 9; i++) part1 += String.fromCharCode(i + d);
      const part2 = [d, 111, w, 128, 132, 97, 95].map((x) => String.fromCharCode(x)).join("");
      const ivString = part1 + part2;
      candidates.push(ivString.substr(0, 16));
    }
  }
  return candidates;
}

function decryptSmartPlayer(hex, iv) {
  try {
    const CJS = require("crypto-js");
    const encrypted = CJS.enc.Hex.parse(padHex(hex));
    const key = CJS.lib.WordArray.create(SP_KEY_WORDS.slice(), 16);
    const ivWA = CJS.enc.Utf8.parse(iv);
    const cfg = { iv: ivWA, mode: CJS.mode.CBC, padding: CJS.pad.Pkcs7 };
    let decrypted;
    try {
      decrypted = CJS.AES.decrypt({ ciphertext: encrypted }, key, cfg);
    } catch (e) {
      decrypted = null;
    }
    if (!decrypted) return "";
    const txt = decrypted.toString(CJS.enc.Utf8);
    if (/^\{/.test(txt.trim())) return txt;
    return "";
  } catch (e) {
    return "";
  }
}

async function extractSmartPlayer(playerUrl, referer) {
  const streams = [];
  const norm = playerUrl.startsWith("//") ? "https:" + playerUrl : playerUrl;
  let domain = "";
  try {
    domain = new URL(norm).host;
  } catch (e) {
    return streams;
  }
  let videoId = "";
  if (norm.includes("#")) videoId = norm.split("#").pop().split("&")[0];
  else if (norm.includes("id=")) videoId = norm.split("id=")[1].split("&")[0];
  if (!videoId) return streams;
  const apiUrl = `https://${domain}/api/v1/video?id=${videoId}`;
  const headers = {
    Referer: `https://${domain}/`,
    Origin: `https://${domain}`,
    Accept: "application/json, text/plain, */*"
  };
  try {
    const body = await fetchText(apiUrl, { headers });
    for (const iv of generateIvCandidates(domain, videoId)) {
      const plain = decryptSmartPlayer(body, iv);
      if (plain) {
        let source = "";
        try {
          const parsed = JSON.parse(plain);
          source = parsed.source || "";
        } catch (e) {
          source = "";
        }
        if (!source) {
          const m1 = plain.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}\/[^\s",\\]+\.m3u8)/);
          const m2 = plain.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}\/[^\s",\\]+)/);
          source = m1 ? m1[1] : m2 ? m2[1] : "";
          if (source) source = "https://" + source;
        }
        if (source) {
          streams.push(toStream("SmartPlayer", "SmartPlayer", cleanStreamUrl(source), "auto", { Referer: `https://${domain}/` }));
          return streams;
        }
      }
    }
  } catch (e) {
    return streams;
  }
  return streams;
}

// ---- generic page -> streams ----------------------------------------------

const IGNORE_URLS = ["google.com/recaptcha", "google.com/ads", "googlesyndication.com", "googletagmanager.com", "doubleclick.net"];
const FILE_HOSTS = ["nitroflare.com", "bowfile.com", "1fichier.com", "ddownload.com", "mdiaload.com", "1cloudfile.com", "workupload.com", "gofile.io", "krakenfiles.com", "racaty.net", "mega.nz", "mediafire.com"];
const MAX_IFRAME_EXPANSIONS = 4;

async function collectIframes(pageUrl, html, referer, depth, visited) {
  const out = [];
  if (depth > 3 || visited.has(pageUrl)) return out;
  visited.add(pageUrl);
  const iframeRe = /<iframe[^>]*?\ssrc=["']([^"']+)["']/gi;
  let m;
  while ((m = iframeRe.exec(html)) !== null) {
    const src = m[1];
    if (FILE_HOSTS.some((h) => src.includes(h))) continue;
    out.push(absoluteUrl(pageUrl, src));
  }
  let expanded = 0;
  const globs = new Set();
  for (const src of out) {
    if (globs.has(src)) continue;
    globs.add(src);
    if (IGNORE_URLS.some((k) => src.includes(k))) continue;
    if (expanded >= MAX_IFRAME_EXPANSIONS) break;
    expanded++;
    try {
      const sub = await fetchText(src, { headers: { Referer: referer } });
      const inner = await extractStreamsFromText(sub, src, referer, depth + 1, visited);
      if (inner.length) return inner;
    } catch (e) {
      continue;
    }
  }
  return [];
}

async function extractStreamsFromText(html, pageUrl, referer, depth, visited) {
  const out = [];
  const seen = new Set();
  const pushStream = (s) => {
    if (!s || !s.url) return;
    if (seen.has(s.url)) return;
    seen.add(s.url);
    out.push(s);
  };

  const unpacked = unpackPacked(html);
  if (unpacked !== html) {
    for (const media of extractMediaUrls(unpacked)) {
      pushStream(toStream("Extractor", "Auto", media.url, media.quality, { Referer: referer }));
    }
  }

  for (const media of extractMediaUrls(html)) {
    pushStream(toStream("Extractor", "Auto", media.url, media.quality, { Referer: referer }));
  }

  const smartRe = /(["'])(https?:\/\/[^"']*\/api\/v1\/video\?id=[^"']+)\1/gi;
  let m;
  while ((m = smartRe.exec(html)) !== null) {
    for (const s of await extractSmartPlayer(m[2], referer)) pushStream(s);
  }

  const iframeStreams = await collectIframes(pageUrl, html, referer, depth || 0, visited || new Set());
  for (const s of iframeStreams) pushStream(s);

  return out;
}

async function extractFromUrl(url, referer) {
  const fixed = String(url).startsWith("//") ? "https:" + url : url;
  if (FILE_HOSTS.some((h) => fixed.includes(h))) return [];
  if (DIRECT_VIDEO.test(fixed)) {
    return [toStream("Extractor", "Direct", fixed, "auto", { Referer: referer })];
  }
  if (/(^|\.)dailymotion\.com/.test(fixed) || /dailymotion\.com\/embed/.test(fixed)) {
    return await extractDailymotion(fixed, { Referer: referer });
  }
  const pageUrl = absoluteUrl(fixed, fixed);
  try {
    const html = await fetchText(pageUrl, { headers: { Referer: referer } });
    return await extractStreamsFromText(html, pageUrl, referer, 0, new Set());
  } catch (e) {
    return [];
  }
}

module.exports = { extractFromUrl, extractStreamsFromText, extractSmartPlayer, extractDailymotion, unpackPacked, toStream, cleanStreamUrl };